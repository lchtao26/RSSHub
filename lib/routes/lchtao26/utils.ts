export function removeSearchParams(url: string) {
    return url.split('?', 1)[0];
}
