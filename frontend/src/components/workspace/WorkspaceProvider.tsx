"use client";

import {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from "react";
import { conversationsApi, type Conversation } from "@/lib/workstations";
import { useWorkstations } from "./useWorkstations";

/**
 * The lens list, owned by the route layout so the sidebar and the detail read
 * the same array.
 *
 * Without this the sidebar and the open workstation each fetch their own copy,
 * and renaming one updates the title while the sidebar keeps the old name until
 * a reload — the kind of disagreement that makes a user distrust everything
 * else on screen.
 *
 * The creation state is here for a related reason: "Nuevo análisis" appears
 * twice (the desktop rail, and the list page below `lg`) and the starters on
 * the empty state are a third entry point, while there is only ever one editor
 * sheet. Two copies of the open flag would eventually disagree about which one
 * is showing.
 *
 * Conversations live here for exactly the same reason as the lens list: the
 * sidebar lists them and the chat writes them (a first question opens a new
 * thread), and two copies would show a thread in one place and not the other.
 * Keyed by workstation id, fetched lazily the first time a lens's threads are
 * looked at.
 */

type Creation = {
    /** Prefills the "what do you want to isolate?" field. A starter that opened
     *  a blank builder would be a label with nothing behind it. */
    seed: string;
};

type WorkspaceData = ReturnType<typeof useWorkstations> & {
    creation: Creation | null;
    startCreating: (seed?: string) => void;
    stopCreating: () => void;

    /** This lens's threads, newest activity first. `null` until loaded. */
    conversationsFor: (workstationId: string) => Conversation[] | null;
    /** Fetch once per lens; safe to call from an effect on every render. */
    loadConversations: (workstationId: string) => void;
    /** A thread the server just opened. Prepended — it is the newest. */
    addConversation: (conversation: Conversation) => void;
    /** A thread that just got a new message bubbles to the top. */
    touchConversation: (workstationId: string, conversationId: string) => void;
    /** The model named the thread; swap the placeholder in the list. */
    renameConversation: (
        workstationId: string,
        conversationId: string,
        title: string
    ) => void;
    /** Delete on the server and in the list. False when the API refused. */
    removeConversation: (workstationId: string, conversationId: string) => Promise<boolean>;
};

const WorkspaceContext = createContext<WorkspaceData | null>(null);

export function useWorkspace(): WorkspaceData {
    const ctx = useContext(WorkspaceContext);
    if (!ctx) throw new Error("useWorkspace must be used inside <WorkspaceProvider>");
    return ctx;
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
    const workstations = useWorkstations();
    const [creation, setCreation] = useState<Creation | null>(null);

    const startCreating = useCallback((seed = "") => setCreation({ seed }), []);
    const stopCreating = useCallback(() => setCreation(null), []);

    const [conversations, setConversations] = useState<Record<string, Conversation[]>>({});
    // Requested ids, so an effect can call load on every render without
    // stampeding the endpoint. A ref, not state: whether a fetch is in flight
    // is bookkeeping, and putting it in state would re-render for nothing.
    const requested = useRef(new Set<string>());

    const conversationsFor = useCallback(
        (workstationId: string) => conversations[workstationId] ?? null,
        [conversations]
    );

    const loadConversations = useCallback((workstationId: string) => {
        if (requested.current.has(workstationId)) return;
        requested.current.add(workstationId);
        conversationsApi
            .list(workstationId)
            .then((res) =>
                setConversations((cur) => ({ ...cur, [workstationId]: res.items }))
            )
            .catch(() => {
                // Let a later look retry; a failed fetch must not read as
                // "this lens has no conversations" forever.
                requested.current.delete(workstationId);
            });
    }, []);

    const addConversation = useCallback((conversation: Conversation) => {
        setConversations((cur) => ({
            ...cur,
            [conversation.workstation_id]: [
                conversation,
                ...(cur[conversation.workstation_id] ?? []),
            ],
        }));
    }, []);

    const touchConversation = useCallback(
        (workstationId: string, conversationId: string) => {
            setConversations((cur) => {
                const list = cur[workstationId];
                if (!list) return cur;
                const hit = list.find((c) => c.id === conversationId);
                if (!hit || list[0] === hit) return cur;
                return {
                    ...cur,
                    [workstationId]: [hit, ...list.filter((c) => c.id !== conversationId)],
                };
            });
        },
        []
    );

    const renameConversation = useCallback(
        (workstationId: string, conversationId: string, title: string) => {
            setConversations((cur) => {
                const list = cur[workstationId];
                if (!list) return cur;
                return {
                    ...cur,
                    [workstationId]: list.map((c) =>
                        c.id === conversationId ? { ...c, title } : c
                    ),
                };
            });
        },
        []
    );

    const removeConversation = useCallback(
        async (workstationId: string, conversationId: string) => {
            try {
                await conversationsApi.remove(conversationId);
            } catch {
                return false;
            }
            setConversations((cur) => ({
                ...cur,
                [workstationId]: (cur[workstationId] ?? []).filter(
                    (c) => c.id !== conversationId
                ),
            }));
            return true;
        },
        []
    );

    const value = useMemo<WorkspaceData>(
        () => ({
            ...workstations,
            creation,
            startCreating,
            stopCreating,
            conversationsFor,
            loadConversations,
            addConversation,
            touchConversation,
            renameConversation,
            removeConversation,
        }),
        [
            workstations,
            creation,
            startCreating,
            stopCreating,
            conversationsFor,
            loadConversations,
            addConversation,
            touchConversation,
            renameConversation,
            removeConversation,
        ]
    );

    return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}
