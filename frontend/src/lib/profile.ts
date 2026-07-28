/**
 * The one place that knows who the user is.
 *
 * There is no auth in v1 (docs/redesign-plan.md §8.3), so this returns a
 * single hardcoded profile. Every identity surface — the sidebar chip, the
 * greeting on /inicio, the defaults in /ajustes — reads it from here, so the
 * day Supabase auth lands `DEV_PROFILE` is the only thing to delete and
 * `useProfile()` becomes a real hook.
 *
 * `email` and `plan` are null on purpose: inventing them would put fake
 * personal data in front of the user, which costs trust in a finance app.
 */

export type Profile = {
    name: string;
    email: string | null;
    plan: string | null;
};

export const DEV_PROFILE: Profile = {
    name: "Eduardo",
    email: null,
    plan: null,
};

export function useProfile(): Profile {
    return DEV_PROFILE;
}
