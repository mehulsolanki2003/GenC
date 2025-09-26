/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./*.html",         // All HTML files in the root
    "./*.js",           // All JS files in the root
    "./api/**/*.js"     // JS files in subfolders (like your api folder)
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
