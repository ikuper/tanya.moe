// I could add more useful comments to my code, but I'm too lazy ¯\_(ツ)_/¯

var localeSelect = document.getElementById("locale-select"),
	options = localeSelect.getElementsByTagName("option"),
	locales = {};

function dispatchEvent() {
	const event = document.createEvent('Event');
	event.initEvent('locale-change', true, true);
	document.dispatchEvent(event);
}

if (window.Element && !Element.prototype.closest) {
	// Thanks Mozilla <3 https://developer.mozilla.org/en-US/docs/Web/API/Element/closest
	// Polyfill for the closest function, since a lot of browsers don't support it
	Element.prototype.closest =
		function(s) {
			var matches = (this.document || this.ownerDocument).querySelectorAll(s),
				i,
				el = this;
			do {
				i = matches.length;
				while (--i >= 0 && matches.item(i) !== el) {};
			} while ((i < 0) && (el = el.parentElement));
			return el;
		};
}

function generateTranslationTable() {
	"use strict";
	// Function that uses the page's content to generate a translation table

	function setValue(object, path, value) {
		// Function that changes the value of an object based on a path contained in an array
		// For example: "setValue(obj, ["foo", "bar"], 123)" is the same as "obj.foo.bar = 123;"

		// <3 https://stackoverflow.com/a/20240290
		for (var i = 0; i < path.length - 1; i++) {
			var key = path[i];
			if (key in object) {
				object = object[key];
			} else {
				object[key] = {};
				object = object[key];
			}
		}
		object[path[path.length - 1]] = value;
	}


	var translatedElements = document.querySelectorAll("[i18n]"),
		translationTable = {};

	for (let i = 0; i < translatedElements.length; i++) {
		var element = translatedElements[i],
			path = [element.getAttribute("i18n")],
			text = element.innerHTML.replace(/[\n\r\t]/g, '');

		while (element.closest("[i18n-group]")) {
			let groupElement = element.closest("[i18n-group]");

			path.unshift(groupElement.getAttribute("i18n-group"));

			element = groupElement.parentElement;
		}

		setValue(translationTable, path, text);
	}

	translationTable._javascriptLocales = javascriptLocales;

	return translationTable;
}

locales.default = generateTranslationTable();
window.generateTranslationTable = generateTranslationTable;

function changeLocale(localeName, skipDefaultLocale) {
	// Changes the locale, but reset it first, in case some text in a locale aren't translated in another one
	// Example: changeLocale("fr")
	if(!skipDefaultLocale) {
		changeLocale("default", true);
	}

	function handleObject(locale, element) {
		for(let value in locale) {
			if(typeof locale[value] === "string") {
				const match = element.querySelector("[i18n=" + value + "]");
				if (match && !match.closest("[i18n-skip]")) {
					match.innerHTML = locale[value];
				}
			} else {
				if (element.querySelector("[i18n-group=" + value + "]")) {
					handleObject(locale[value], element.querySelector("[i18n-group=" + value + "]"));
				}
			}
		}
	}

	handleObject(locales[localeName], document.body);
	window.javascriptLocales = locales[localeName]._javascriptLocales;
	document.documentElement.lang = (localeName === "default") ? "en" : localeName;

	if(localeName === "default") {
		document.documentElement.lang = "en";
		window.history.pushState('', '', window.location.pathname)
	} else {
		document.documentElement.lang = localeName;
		window.location.hash = localeName;
	}

	dispatchEvent();
}

const bestLocale = (navigator.languages || [window.navigator.userLanguage || window.navigator.language])
	.map(lang =>
		([...options].find(option =>
			lang.startsWith(option.lang) ||
			(option.lang === 'zh-Hans' && (
				lang === 'zh-CN' || (
					lang === 'zh' &&
					!navigator.languages.some(lang => lang.startsWith('zh-'))
				)
			))
		) || {}).value
	)
	.filter(lang => lang != null)[0];

for (const option of options) {
	let shouldSwitch = false;

	if (window.location.hash.replace(/^\#/g, "") === option.value) {
		localeSelect.value = option.value;
		shouldSwitch = true;
	}

	if (option.value !== "default") {
		const xhr = new XMLHttpRequest();
		xhr.open("GET", "locale/" + option.value + ".json", true);
		xhr.onreadystatechange = function() {
			if (xhr.readyState === 4 && xhr.status === 200) {
				var translation = JSON.parse(xhr.responseText);
				locales[option.value] = translation;
				option.disabled = false;

				postDownload();
			}
		};

		xhr.send();

	} else {
		setTimeout(postDownload);
	}

	function postDownload() {
		if (shouldSwitch) {
			changeLocale(option.value);
		}

		console.log(option.value, bestLocale, localeSelect.value);

		if (option.value === bestLocale && localeSelect.value !== option.value) {
			const translation = locales[bestLocale]['main-intro']['language-protip'];

			if (translation) {
				document.getElementById('language-protip-text').innerHTML = locales[bestLocale]['main-intro']['language-protip'];
				document.getElementById('language-protip').style.display = "block";
			}
		}
	}
}

localeSelect.onchange = function(e) {
	changeLocale(e.target.value);
}

localeSelect.onclick = () => document.getElementById('language-protip').style.display = "none";
