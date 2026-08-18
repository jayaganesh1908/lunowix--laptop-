/*
 * Twitter reuses the Open Graph card. Next does not fall back from one to the
 * other on its own — without this file the `twitter:image` tag is simply
 * absent, and a link posted there renders as a bare text row.
 */
export { default, alt, size, contentType } from "./opengraph-image";
