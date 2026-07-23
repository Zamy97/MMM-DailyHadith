Module.register("MMM-DailyHadith", {
	defaults: {
		showTitle: true,
		showTopic: true,
		showSummary: true,
		showArabic: true,
		showTranslation: true,
		showBangla: true,
		showReference: true,
		showNarrator: true,
		bilingual: false,
		// 0 = show full text. Set a number to truncate at a complete sentence.
		maxTextChars: 0,
		maxSummaryChars: 520,
		dataFile: "data/hadiths.json",
		rotationMode: "daily",
		updateInterval: 60 * 60 * 1000,
		animationSpeed: 2000,
		language: config.language || "en"
	},

	getStyles() {
		return ["MMM-DailyHadith.css"];
	},

	getTranslations() {
		return {
			en: "translations/en.json",
			bn: "translations/bn.json"
		};
	},

	usesBangla() {
		return this.config.language === "bn";
	},

	/**
	 * Truncate for display at the last complete sentence within maxLength.
	 * Avoids mid-sentence cutoffs that make the hadith hard to understand.
	 */
	truncateAtSentence(value, maxLength) {
		const cleaned = String(value || "")
			.replace(/\s+/g, " ")
			.trim();
		if (!cleaned || !maxLength || cleaned.length <= maxLength) {
			return cleaned;
		}

		const slice = cleaned.slice(0, maxLength);
		const sentenceEnd = /[.!?।…](?=\s|$)/g;
		let lastEnd = -1;
		let match;
		while ((match = sentenceEnd.exec(slice)) !== null) {
			lastEnd = match.index;
		}

		if (lastEnd >= 120) {
			return slice.slice(0, lastEnd + 1).trim();
		}

		const lastSpace = slice.lastIndexOf(" ");
		if (lastSpace > 80) {
			return `${slice.slice(0, lastSpace).trim()}…`;
		}

		return `${slice.trim()}…`;
	},

	getDisplayText() {
		let text = "";
		if (this.usesBangla() && this.hadith.textBn) {
			text = this.hadith.textBn;
		} else {
			text = this.hadith.text || "";
		}
		return this.truncateAtSentence(text, this.config.maxTextChars);
	},

	getDisplaySummary() {
		let summary = "";
		if (this.usesBangla() && this.hadith.summaryBn) {
			summary = this.hadith.summaryBn;
		} else {
			summary = this.hadith.summary || "";
		}
		return this.truncateAtSentence(summary, this.config.maxSummaryChars);
	},

	requestHadith() {
		this.sendSocketNotification("GET_HADITH", {
			dataFile: this.config.dataFile,
			rotationMode: this.config.rotationMode
		});
	},

	appendBlock(wrapper, className, html) {
		if (!html) {
			return;
		}

		const block = document.createElement("div");
		block.className = className;
		block.innerHTML = html;
		wrapper.appendChild(block);
	},

	start() {
		Log.info(`Starting module: ${this.name}`);
		this.hadith = null;
		this.collection = "";
		this.errorMessage = null;

		this.requestHadith();

		setInterval(() => {
			this.requestHadith();
		}, this.config.updateInterval);
	},

	getDom() {
		const wrapper = document.createElement("div");

		if (this.errorMessage) {
			wrapper.className = "dimmed light small error";
			wrapper.innerHTML = this.translate("ERROR");
			return wrapper;
		}

		if (!this.hadith) {
			wrapper.className = "dimmed light small";
			wrapper.innerHTML = this.translate("LOADING");
			return wrapper;
		}

		if (this.config.showTitle) {
			this.appendBlock(wrapper, "hadith-title bright small light", this.translate("TITLE"));
		}

		if (this.config.showTopic) {
			const topic =
				this.usesBangla() && this.hadith.topicBn ? this.hadith.topicBn : this.hadith.topic;
			if (topic) {
				this.appendBlock(
					wrapper,
					"hadith-topic dimmed xsmall light",
					`${this.translate("TOPIC")}: ${topic}`
				);
			}
		}

		if (this.config.showArabic && this.hadith.arabic) {
			this.appendBlock(
				wrapper,
				"hadith-arabic bright medium light",
				this.truncateAtSentence(this.hadith.arabic, this.config.maxTextChars)
			);
		}

		if (this.config.showTranslation) {
			const displayText = this.getDisplayText();
			if (displayText) {
				const usingBangla = this.usesBangla() && this.hadith.textBn;
				const translationClass = usingBangla
					? "hadith-bangla bright small light"
					: "hadith-translation bright small light";
				let html = "";

				if (this.config.showNarrator && this.hadith.narrator && !usingBangla) {
					html += `<span class="hadith-narrator">${this.hadith.narrator}</span> `;
				}

				html += displayText;
				this.appendBlock(wrapper, translationClass, html);
			}
		}

		if (this.config.bilingual && this.usesBangla() && this.hadith.textBn && this.hadith.text) {
			this.appendBlock(
				wrapper,
				"hadith-translation dimmed xsmall light",
				this.truncateAtSentence(this.hadith.text, this.config.maxTextChars)
			);
		}

		if (!this.usesBangla() && this.config.showBangla && this.hadith.textBn) {
			this.appendBlock(
				wrapper,
				"hadith-bangla bright small light",
				this.truncateAtSentence(this.hadith.textBn, this.config.maxTextChars)
			);
		}

		if (this.config.showSummary) {
			const summary = this.getDisplaySummary();
			if (summary) {
				this.appendBlock(
					wrapper,
					"hadith-summary bright xsmall light",
					`<span class="hadith-summary-label">${this.translate("SUMMARY")}:</span> ${summary}`
				);
			}
		}

		if (this.config.showReference && this.hadith.reference) {
			this.appendBlock(wrapper, "hadith-reference dimmed xsmall light", this.hadith.reference);
		}

		return wrapper;
	},

	socketNotificationReceived(notification, payload) {
		if (notification === "HADITH_RESULT") {
			this.errorMessage = null;
			this.hadith = payload.hadith;
			this.collection = payload.collection;
			this.updateDom(this.config.animationSpeed);
		}

		if (notification === "HADITH_ERROR") {
			this.errorMessage = payload.message;
			this.hadith = null;
			this.updateDom(this.config.animationSpeed);
		}
	}
});
