// Define a single source of truth for character mappings
const charMap = {
    "А": "A", "а": "a",
    "Б": "B", "б": "b",
    "В": "V", "в": "v",
    "Г": "G", "г": "g",
    "Ґ": "Ĝ", "ґ": "ĝ",
    "Д": "D", "д": "d",
    "Е": "E", "е": "e",
    "Є": "Je", "є": "je",
    "Ж": "Ž", "ж": "ž",
    "З": "Z", "з": "z",
    "И": "Y", "и": "y",
    "І": "I", "і": "i",
    "Ї": "Ji", "ї": "ji",
    "Й": "J", "й": "j",
    "К": "K", "к": "k",
    "Л": "L", "л": "l",
    "М": "M", "м": "m",
    "Н": "N", "н": "n",
    "О": "O", "о": "o",
    "П": "P", "п": "p",
    "Р": "R", "р": "r",
    "С": "S", "с": "s",
    "Т": "T", "т": "t",
    "У": "U", "у": "u",
    "Ф": "F", "ф": "f",
    "Х": "H", "х": "h",
    "Ц": "C", "ц": "c",
    "Ч": "Č", "ч": "č",
    "Ш": "Š", "ш": "š",
    "Щ": "Šč", "щ": "šč",
    "Ь": "'", "ь": "'",
    "Ю": "Ju", "ю": "ju",
    "Я": "Ja", "я": "ja"
};

const reverseCharMap = Object.fromEntries(
    Object.entries(charMap).map(([key, value]) => [value, key])
);

function transliterate(text) {
    return text.split("").map(char => charMap[char] || char).join("");
}

function reverseTransliterate(text) {
    let result = "";
    let i = 0;
    while (i < text.length) {
        let char = text[i];
        let nextChar = text[i + 1] || "";
        let twoChars = char + nextChar.toLowerCase();

        if (reverseCharMap[twoChars]) {
            result += reverseCharMap[twoChars];
            i += 2;
        } else if (reverseCharMap[char]) {
            result += reverseCharMap[char];
            i++;
        } else if (char === "'") {
            let prevChar = result[result.length - 1] || "";
            let nextChar = text[i + 1] || "";
            if (isLabialConsonant(prevChar) && isVowelOrSemivowel(nextChar)) {
                result += "'";
            } else {
                result += "ь";
            }
            i++;
        } else {
            result += char;
            i++;
        }
    }
    return result;
}

function isLabialConsonant(char) {
    return "бвмпф".includes(char.toLowerCase());
}

function isVowelOrSemivowel(char) {
    return "аеєиіїоуюя".includes(char.toLowerCase());
}