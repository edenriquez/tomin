"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

/**
 * A view with two faces, addressable as `?cara=…`.
 *
 * The face used to be read straight from `useSearchParams()` and written with
 * `router.replace()`. That is a *navigation*: the App Router keys its cache on
 * pathname + search, so `/?cara=recurrentes` is a different entry than `/`, and
 * a click on a tab paid for an RSC round trip before anything moved on screen
 * (~850ms on a throttled connection), then swapped the page subtree in — probe,
 * chrome and every fetch below it starting over, a skeleton nobody asked for,
 * and the layout bouncing on the way back up.
 *
 * The face is state; the URL is only its address. So: the face flips in the
 * same frame as the click, and the address is mirrored with the History API,
 * which Next patches to keep `usePathname`/`useSearchParams` honest without
 * touching the router cache. A reload or a shared link still lands on the right
 * face, and a link from another view still arrives as a real navigation — the
 * effect below follows the URL whenever it moves on its own (back/forward).
 */
export function useFace<T extends string>(
    parse: (value: string | null) => T,
    href: (face: T) => string,
    param = "cara"
): [T, (next: T) => void] {
    const params = useSearchParams();
    const fromUrl = parse(params.get(param));
    const [face, setFace] = useState<T>(fromUrl);

    // The URL moved without us: back/forward, or a link into the other face.
    useEffect(() => {
        setFace(fromUrl);
    }, [fromUrl]);

    // `href` is usually a module-level function, but a caller may inline one;
    // keeping it in a ref means `pick` stays stable either way.
    const hrefRef = useRef(href);
    hrefRef.current = href;

    const pick = useCallback((next: T) => {
        setFace(next);
        // `replace`, not `push`: the two faces are one reading, and Back should
        // leave the view, not toggle it.
        window.history.replaceState(null, "", hrefRef.current(next));
    }, []);

    return [face, pick];
}
