import { useSiteSettingsStore } from "../stores/siteSettingsStore"

interface TranslateResult {
  translations: { detected_source_lang: string; text: string }[]
}

export async function translateText(textList: string[]): Promise<string[]> {
  const settings = useSiteSettingsStore.getState().settings
  if (!settings?.translate_api || !textList.length) return textList

  const nonEmpty = textList.filter(t => t.trim())
  if (!nonEmpty.length) return textList

  try {
    const res = await fetch(settings.translate_api, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source_lang: settings.translate_source_lang || "auto",
        target_lang: settings.translate_target_lang || "chinese",
        text_list: nonEmpty,
      }),
    })

    if (!res.ok) return textList

    const data: TranslateResult = await res.json()
    if (!data.translations?.length) return textList

    const translated = data.translations.map(t => t.text)
    let ti = 0
    return textList.map(t => (t.trim() ? translated[ti++] ?? t : t))
  } catch {
    return textList
  }
}