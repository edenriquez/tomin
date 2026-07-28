/**
 * Typed client for the tag surface.
 *
 * Tags are the user's own vocabulary over their movements — the one dimension
 * the bank does not supply. They are deliberately *not* categories: a movement
 * has exactly one category and any number of tags, which is why every total
 * grouped by tag overlaps and must never be drawn as parts of a whole.
 *
 * A transaction carries `tag_ids`, not embedded tag objects, so a name is
 * resolved against the tag list the page already has. `tagIndex` is the one
 * place that lookup is built.
 */

import { request } from "./api";

/** `investment` tags are the ones the investment metrics read; `plain` is the
 *  default and carries no behaviour beyond grouping. */
export type TagKind = "plain" | "investment";

export type Tag = {
    id: string;
    name: string;
    slug: string;
    color: string | null;
    kind: TagKind;
    created_at: string;
};

export type TagInput = { name: string; kind?: TagKind; color?: string | null };

/** 409 means the slug already exists. Worth distinguishing at the call site:
 *  "ya tienes una etiqueta con ese nombre" is a different sentence from "no
 *  pudimos guardar". `request` puts the status in the message. */
export function isDuplicateTagError(error: unknown): boolean {
    return error instanceof Error && error.message.startsWith("API 409");
}

export const tagsApi = {
    list: () => request<{ items: Tag[] }>("/api/tags").then((r) => r.items),

    create: (body: TagInput) =>
        request<Tag>("/api/tags", { method: "POST", body: JSON.stringify(body) }),

    update: (id: string, body: Partial<TagInput>) =>
        request<Tag>(`/api/tags/${id}`, { method: "PATCH", body: JSON.stringify(body) }),

    remove: (id: string) => request<unknown>(`/api/tags/${id}`, { method: "DELETE" }),

    /** Replaces the whole set on one transaction. Sending the full list rather
     *  than a diff means two sheets open at once cannot interleave into a state
     *  neither user asked for — the last save wins, visibly. */
    setForTransaction: (transactionId: string, tagIds: string[]) =>
        request<{ tag_ids: string[] }>(`/api/transactions/${transactionId}/tags`, {
            method: "PUT",
            body: JSON.stringify({ tag_ids: tagIds }),
        }),

    /** Adds one tag to many transactions. Additive on purpose: bulk tagging is
     *  "also mark these", never "make these the only tags". */
    attachTransactions: (tagId: string, transactionIds: string[]) =>
        request<unknown>(`/api/tags/${tagId}/transactions`, {
            method: "POST",
            body: JSON.stringify({ transaction_ids: transactionIds }),
        }),
};

export const { list: listTags, create: createTag } = tagsApi;

/** id -> tag, for turning a transaction's `tag_ids` into chips. */
export function tagIndex(tags: Tag[]): Map<string, Tag> {
    return new Map(tags.map((t) => [t.id, t]));
}

/** Case- and accent-insensitive contains, so "cafe" finds "Café". */
export function matchesTag(tag: Tag, query: string): boolean {
    return fold(tag.name).includes(fold(query));
}

/** True when no existing tag has exactly this name — i.e. "crear" is offerable. */
export function isNewTagName(tags: Tag[], query: string): boolean {
    const q = fold(query.trim());
    return q.length > 0 && !tags.some((t) => fold(t.name) === q);
}

function fold(value: string): string {
    return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}
