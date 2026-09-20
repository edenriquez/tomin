import {
    Banknote,
    Bus,
    Clapperboard,
    Home,
    PiggyBank,
    Receipt,
    ShoppingCart,
    TrendingDown,
    type LucideIcon,
} from "lucide-react";
import type { CategoryInfo } from "./categories";

/**
 * Seed taxonomy icon names → lucide glyphs.
 *
 * The backend names icons in Material Symbols vocabulary (`commute`,
 * `shopping_cart`); this is the one place that translation happens, so a row
 * avatar and a category header cannot end up with different glyphs for the
 * same category. Anything unknown reads as a generic receipt — a wrong guess
 * at a merchant would be worse than none.
 */
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
    home: Home,
    shopping_cart: ShoppingCart,
    commute: Bus,
    movie: Clapperboard,
    payments: Banknote,
    savings: PiggyBank,
    outbound: TrendingDown,
};

/** The glyph for a category id, walking nothing: the id given is the one asked
 *  about. Children inherit their parent's icon at seed time. */
export function categoryIcon(
    categories: Map<string, CategoryInfo> | null,
    id: string | null | undefined
): LucideIcon {
    const name = (id && categories?.get(id)?.icon) || "";
    return CATEGORY_ICONS[name] ?? Receipt;
}
