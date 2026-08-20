import { Fragment, type ReactNode } from "react";

/**
 * The assistant's text, rendered instead of dumped.
 *
 * A deliberately small dialect — paragraphs, **negritas**, *cursivas*,
 * `código`, listas con guiones y numeradas — matching what the system prompt
 * allows the model to produce. Not a Markdown library: the input is one
 * model's constrained output, not arbitrary documents, and every construct
 * this file does not know stays visible as text instead of vanishing.
 *
 * Everything is built as React nodes; no HTML string ever reaches the DOM,
 * so a movement description containing `<script>` renders as its own
 * characters.
 *
 * The prompt forbids LaTeX, but a prompt is a request and models drift — so
 * `\[ \frac{a}{b} \]` blocks are folded to plain arithmetic ("a ÷ b") before
 * parsing rather than shown as source code the user has to squint at.
 */
export function ChatMarkdown({ text }: { text: string }) {
    return <>{parseBlocks(deLatex(text))}</>;
}

/* ----------------------------- LaTeX fallback ----------------------------- */

const MATH_BLOCK = /\\\[([\s\S]*?)\\\]|\\\(([\s\S]*?)\\\)/g;

function deLatex(text: string): string {
    return text.replace(MATH_BLOCK, (_, block, inline) => {
        const plain = latexToPlain((block ?? inline ?? "") as string);
        return plain ? ` ${plain} ` : " ";
    });
}

function latexToPlain(src: string): string {
    let out = src;
    // \frac{a}{b} → a ÷ b, innermost first so nesting unwinds.
    const frac = /\\[dt]?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/;
    for (let guard = 0; frac.test(out) && guard < 10; guard++) {
        out = out.replace(frac, "$1 ÷ $2");
    }
    return out
        .replace(/\\text\s*\{([^{}]*)\}/g, "$1")
        .replace(/\\approx/g, "≈")
        .replace(/\\times/g, "×")
        .replace(/\\cdot/g, "·")
        .replace(/\\(?:left|right)/g, "")
        .replace(/\\[,;!:]/g, " ")
        .replace(/\\[a-zA-Z]+/g, " ")
        // Inside math, a bare semicolon is spacing (a half-eaten `\;`), never
        // meaning — this replace only ever sees text between \[ and \].
        .replace(/;/g, " ")
        .replace(/[{}$]/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

/* -------------------------------- blocks --------------------------------- */

const BULLET = /^\s*[-•*]\s+(.*)$/;
const ORDERED = /^\s*(\d+)[.)]\s+(.*)$/;
const HEADING = /^#{1,4}\s+(.*)$/;

function parseBlocks(text: string): ReactNode[] {
    const lines = text.split("\n");
    const out: ReactNode[] = [];
    let i = 0;
    let key = 0;

    while (i < lines.length) {
        const line = lines[i];
        if (!line.trim()) {
            i += 1;
            continue;
        }

        if (BULLET.test(line)) {
            const items: string[] = [];
            while (i < lines.length && BULLET.test(lines[i])) {
                items.push(lines[i].match(BULLET)![1]);
                i += 1;
            }
            out.push(
                <ul key={key++} className="my-1.5 space-y-1 pl-1">
                    {items.map((item, j) => (
                        <li key={j} className="flex gap-2">
                            <span aria-hidden className="select-none text-ash">
                                –
                            </span>
                            <span className="min-w-0">{renderInline(item)}</span>
                        </li>
                    ))}
                </ul>
            );
            continue;
        }

        if (ORDERED.test(line)) {
            const items: { n: string; text: string }[] = [];
            while (i < lines.length && ORDERED.test(lines[i])) {
                const m = lines[i].match(ORDERED)!;
                items.push({ n: m[1], text: m[2] });
                i += 1;
            }
            out.push(
                <ol key={key++} className="my-1.5 space-y-1 pl-1">
                    {items.map((item, j) => (
                        <li key={j} className="flex gap-2">
                            <span aria-hidden className="tabular select-none text-ash">
                                {item.n}.
                            </span>
                            <span className="min-w-0">{renderInline(item.text)}</span>
                        </li>
                    ))}
                </ol>
            );
            continue;
        }

        // A heading in a chat answer is a paragraph that wants weight, not a
        // document section; giving it real <h*> levels would fight the page's.
        const heading = line.match(HEADING);
        if (heading) {
            out.push(
                <p key={key++} className="mt-2 font-medium text-ink">
                    {renderInline(heading[1])}
                </p>
            );
            i += 1;
            continue;
        }

        // Paragraph: consecutive plain lines, joined the way Markdown reads.
        const parts: string[] = [];
        while (
            i < lines.length &&
            lines[i].trim() &&
            !BULLET.test(lines[i]) &&
            !ORDERED.test(lines[i]) &&
            !HEADING.test(lines[i])
        ) {
            parts.push(lines[i].trim());
            i += 1;
        }
        out.push(<p key={key++}>{renderInline(parts.join(" "))}</p>);
    }

    return out;
}

/* -------------------------------- inline ---------------------------------- */

const INLINE = /\*\*([^*]+)\*\*|\*([^*\n]+)\*|`([^`\n]+)`/g;

function renderInline(text: string): ReactNode {
    const nodes: ReactNode[] = [];
    let last = 0;
    let key = 0;
    INLINE.lastIndex = 0;
    for (let match = INLINE.exec(text); match !== null; match = INLINE.exec(text)) {
        const index = match.index;
        if (index > last) nodes.push(text.slice(last, index));
        const [, bold, italic, code] = match;
        if (bold !== undefined) {
            nodes.push(
                <strong key={key++} className="font-medium text-ink">
                    {bold}
                </strong>
            );
        } else if (italic !== undefined) {
            nodes.push(<em key={key++}>{italic}</em>);
        } else {
            nodes.push(
                <code key={key++} className="rounded bg-fog px-1 text-[0.9em] text-ink">
                    {code}
                </code>
            );
        }
        last = index + match[0].length;
    }
    if (last < text.length) nodes.push(text.slice(last));
    return nodes.length === 1 ? nodes[0] : <Fragment>{nodes}</Fragment>;
}
