/*
Limited support for some latex environments, only for rendering (not editing).
*/

export default function latexEnvs(value: string): string {
  value = transformFigures(value);
  value = transformItemEnvironments(value);
  return value;
}

/*
transformFigures -- dumb parser to turn this:

---

...

\begin{figure}
\centering
\centerline{\includegraphics[width=WIDTH]{URL}}
\caption{CAPTION}
\end{figure}

...

---

into this:

---

...

<div style="text-align:center"><img src="URL" style="width:WIDTH"/></div>
\begin{equation}
\text{CAPTION}
\end{equation}

...

---

There can be lots of figures.
*/

function transformFigures(content: string): string {
  while (true) {
    const i = content.indexOf("\\begin{figure}");
    if (i == -1) {
      return content;
    }
    const j = content.indexOf("\\end{figure}");
    if (j == -1) {
      return content;
    }
    const k = content.indexOf("\\includegraphics");
    if (k == -1) {
      return content;
    }
    const c = content.indexOf("\\caption{");
    if (c == -1) {
      return content;
    }
    const c2 = content.lastIndexOf("}", j);
    if (c2 == -1) {
      return content;
    }

    const w = content.indexOf("width=");
    const w2 = content.indexOf("{", k);
    const w3 = content.indexOf("}", k);
    if (w2 == -1 || w3 == -1) {
      return content;
    }
    let style = "";
    if (w != -1) {
      style = `width:${content.slice(w + "width=".length, w2 - 1)}`;
    }
    const url = content.slice(w2 + 1, w3);
    const caption = content.slice(c + "\\caption{".length, c2);

    const md = `\n\n<div style="text-align:center"><img src="${url}" style="${style}"/></div>\n\n
\\begin{equation}
\\text{${caption}}
\\end{equation}\n\n`;

    content =
      content.slice(0, i) + md + content.slice(j + "\\end{figure}".length);
  }
}

/*
transformEnumerate -- dumb parser to turn this:

---

...

\begin{enumerate}
\item ITEM1
\item ITEM2
...
\end{enumerate}

...

---

into this:

---

...

1. ITEM1

1. ITEM2

...

---

and

---

\begin{itemize}
\item ITEM1
\item ITEM2
...
\end{itemize}

into

- ITEM1

- ITEM2

*/

function transformItemEnvironments(content: string) {
  for (const type of ["itemize", "enumerate"]) {
    content = transformItemsType(content, type as "itemize" | "enumerate");
  }
  return content;
}

function transformItemsType(
  content: string,
  type: "itemize" | "enumerate",
): string {
  while (true) {
    const BEGIN = `\\begin{${type}}`;
    const i = content.indexOf(BEGIN);
    if (i == -1) {
      return content;
    }
    const END = `\\end{${type}}`;
    const j = content.indexOf(END);
    if (j == -1) {
      return content;
    }

    const body = content.slice(i + BEGIN.length + 1, j);
    const items = body
      .split("\\item")
      .filter((x) => x.trim())
      .map((x) => (type == "itemize" ? "- " : "1. ") + x)
      .join("\n\n");
    content =
      content.slice(0, i) +
      "\n\n" +
      items +
      "\n\n" +
      content.slice(j + END.length + 1);
  }
  return content;
}
