const editKey = (id: string) => `hummunication.weekly.edit.${id}`;

// This tab-only date-code confirmation is separate from server authentication.
export function allowBulletinEdit(id: string) { sessionStorage.setItem(editKey(id), "1"); }
export function canEditBulletin(id: string) { return sessionStorage.getItem(editKey(id)) === "1"; }
export function endBulletinEdit(id: string) { sessionStorage.removeItem(editKey(id)); }
