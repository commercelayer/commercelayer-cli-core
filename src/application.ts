import { ApiMode } from "./api";

interface AppKey {
	key: string;
	mode: ApiMode;
	id?: string;
	alias?: string;
}


interface AppAuth {
	slug: string;
	domain?: string;
	clientId: string;
	clientSecret?: string;
	scope?: string[] | string;
	email?: string;
	password?: string;
}

interface AppInfo extends AppKey, AppAuth {
	organization: string;
	kind: string;
	name: string;
	baseUrl?: string;
}


export type { AppKey, AppAuth, AppInfo }


/** Build application key */
const appKey = (): string => {
	return Date.now().toString(36)
}


/** Check application key */
const appKeyValid = (appKey: AppKey): boolean => {
	return (appKey.key !== undefined) && (appKey.key !== '')
}


/** Check if two application keys are equal */
const appKeyMatch = (app1?: AppKey, app2?: AppKey): boolean => {
	const a1 = app1 !== undefined
	const a2 = app2 !== undefined
	return (!a1 && !a2) || (a1 && a2 && (app1.key === app2.key))
}


export { appKey, appKeyValid, appKeyMatch }
