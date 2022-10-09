import { User } from "../entities/User";
import {
  Arg,
  Field,
  InputType,
  Mutation,
  Query,
  Resolver,
  ObjectType,
  Ctx,
} from "type-graphql";
import argon2 from "argon2";
import { AppDataSource } from "../data-source";
import { AppContext } from "../types";
import { COOKIE_NAME } from "../constants";

@InputType()
class UserPasswordInput {
  @Field()
  username: string;

  @Field()
  password: string;
}

@ObjectType()
class FieldError {
  @Field()
  field: string;

  @Field()
  message: string;
}

@ObjectType()
class UserResponse {
  @Field(() => [FieldError], { nullable: true })
  errors?: FieldError[];

  @Field(() => User, { nullable: true })
  user?: User;
}

@Resolver()
export class UserResolver {
  @Query(() => User, { nullable: true })
  async me(@Ctx() ctx: AppContext): Promise<User | null> {
    if (!ctx.req.session.userId) {
      return null;
    }

    return await User.findOneBy({ id: ctx.req.session.userId });
  }

  @Mutation(() => UserResponse)
  async login(
    @Arg("options") options: UserPasswordInput,
    @Ctx() ctx: AppContext
  ) {
    const user = await User.findOneBy({ username: options.username });
    if (!user) {
      return {
        errors: [
          {
            field: "username",
            message: "username doesn't exist",
          },
        ],
      };
    }

    const isValid = await argon2.verify(user.password, options.password);

    if (!isValid) {
      return {
        errors: [
          {
            field: "password",
            message: "incorrect password",
          },
        ],
      };
    }

    ctx.req.session.userId = user.id;

    return { user };
  }

  @Mutation(() => UserResponse)
  async register(
    @Arg("options") options: UserPasswordInput,
    @Ctx() ctx: AppContext
  ): Promise<UserResponse> {
    if (options.username.length <= 2) {
      return {
        errors: [
          {
            field: "username",
            message: "username length must be greater than 2",
          },
        ],
      };
    }

    if (options.password.length <= 2) {
      return {
        errors: [
          {
            field: "username",
            message: "password length must be greater than 2",
          },
        ],
      };
    }

    const hashedPassword = await argon2.hash(options.password);
    let user;

    try {
      const result = await AppDataSource.createQueryBuilder()
        .insert()
        .into(User)
        .values({
          username: options.username,
          password: hashedPassword,
        })
        .returning("*")
        .execute();

      user = result.raw[0];
    } catch (error) {
      if (error.code === "23505") {
        return {
          errors: [
            {
              field: "username",
              message: "username already taken",
            },
          ],
        };
      }
    }

    ctx.req.session.userId = user.id;

    return { user };
  }

  @Mutation(() => Boolean)
  logout(@Ctx() ctx: AppContext) {
    return new Promise((resolve) => {
      ctx.req.session.destroy((error: any) => {
        if (error) {
          console.log(error);
          resolve(false);
        }

        ctx.res.clearCookie(COOKIE_NAME);
        resolve(true);
      });
    });
  }
}
