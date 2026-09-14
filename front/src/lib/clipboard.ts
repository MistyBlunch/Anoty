export async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    const input = document.createElement("input")
    input.value = text
    document.body.appendChild(input)
    input.select()
    document.execCommand("copy")
    document.body.removeChild(input)
  }
}