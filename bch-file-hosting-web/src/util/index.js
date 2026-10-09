/*
  A utility library for holding functions that are commonly used by many different
  areas of the app.
*/

class AppUtil {
  // Returns a promise that resolves 'ms' milliseconds.
  sleep (ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // Copy a text to clipboard
  async copyToClipboard (text) {
    try {
      await navigator.clipboard.writeText(text)
    } catch (err) {
      console.error('Failed to copy text:', err)
      // document.body.removeChild(textarea)
      return false
    }
  }

  // Read text from clipboard
  async readFromClipboard () {
    try {
      const text = await navigator.clipboard.readText()

      return text
    } catch (err) {
      console.error('Failed to copy text:', err)
      // document.body.removeChild(textarea)
      return false
    }
  }
}

export default AppUtil
