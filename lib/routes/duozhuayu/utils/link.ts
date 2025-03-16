export function removeSearchParams(link: string) {
    return link ? new URL(link).origin + new URL(link).pathname : '';
}
