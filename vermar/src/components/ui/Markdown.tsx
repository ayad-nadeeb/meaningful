import { Remarkable } from "remarkable";
import { MouseEvent, useEffect, useState } from "react";
import { Interweave } from "interweave";
import { useCopy } from "../../composables/useCopy";

const md = new Remarkable();
const trimify = (value: string): string =>
  value?.replace(/\n\s*\n/g, "\n\n").trim();

export const Markdown = ({ source = "" }: { source?: string }) => {
  const [markdown, setMarkdown] = useState("");
  const { copyToClipboard } = useCopy();

  useEffect(() => {
    setMarkdown(md.render(source));
  }, [source]);

  useEffect(() => {
    const body = document.querySelector(".markdown-body");
    if (body !== null)
      body.querySelectorAll("pre>code").forEach(function (code) {
        const parent = code.parentElement;
        if (parent !== null) parent.classList.add("rounded-lg");
        const copyButton = document.createElement("a");
        const icon = document.createElement("span");
        icon.textContent = "copy";
        icon.classList.add("copy");
        icon.classList.add("text-skin-text");
        copyButton.appendChild(icon);
        copyButton.addEventListener("click", function () {
          if (parent !== null) copyToClipboard(parent.innerText.trim());
        });
        code.appendChild(copyButton);
      });
  });

  return (
    <div className="markdown-body break-words">
      <Interweave
        allowAttributes
        allowElements
        content={trimify(markdown)}
        onClick={(event: MouseEvent<HTMLDivElement>) => event.stopPropagation()}
      />
    </div>
  );
};
