export interface Messages {
    "Invalid stream": string;
    "End of list": string;
    "Sorry, an unknown error occured": string;
    "Whoops, that page doesn't exist": string;
    "developer, coach, speaker": string;
    "Schörgelgasse 3, 8010 Graz, Austria": string;
}

const english: Messages = {
    "Invalid stream": "Invalid stream",
    "End of list": "End of list",
    "Sorry, an unknown error occured": "Sorry, an unknown error occured",
    "Whoops, that page doesn't exist": "Whoops, that page doesn't exist",
    "developer, coach, speaker": "developer • coach • speaker",
    "Schörgelgasse 3, 8010 Graz, Austria": "Schörgelgasse 3, 8010 Graz, Austria",
};

export type LanguageCode = "en";

const translations: Record<LanguageCode, Messages> = {
    en: english,
};

export function i18n<T extends keyof Messages>(key: T): Messages[T] {
    const userLocale = navigator.language || (navigator as any).userLanguage;
    const languageCode = userLocale ? (userLocale.split("-")[0] as LanguageCode) : "en";
    const implementation = translations[languageCode];
    const message = implementation ? implementation[key] : translations["en"][key];
    if (!message) {
        console.error("Unknown i18n string " + key);
        return key as any as Messages[T];
    }
    return message;
}
