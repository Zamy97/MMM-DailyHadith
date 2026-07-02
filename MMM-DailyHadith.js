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
				this.config.language === "bn" && this.hadith.topicBn
					? this.hadith.topicBn
					: this.hadith.topic;
			if (topic) {
				this.appendBlock(
					wrapper,
					"hadith-topic dimmed xsmall light",
					`${this.translate("TOPIC")}: ${topic}`
				);
			}
		}

		if (this.config.showArabic && this.hadith.arabic) {
			this.appendBlock(wrapper, "hadith-arabic bright medium light", this.hadith.arabic);
		}

		if (this.config.showTranslation) {
			let html = "";
			if (this.config.showNarrator && this.hadith.narrator) {
				html += `<span class="hadith-narrator">${this.hadith.narrator}</span> `;
			}
			if (this.hadith.text) {
				html += this.hadith.text;
			}
			this.appendBlock(wrapper, "hadith-translation bright small light", html);
		}

		if (this.config.showBangla && this.hadith.textBn) {
			this.appendBlock(wrapper, "hadith-bangla bright small light", this.hadith.textBn);
		}

		if (this.config.showSummary) {
			const summary =
				this.config.language === "bn" && this.hadith.summaryBn
					? this.hadith.summaryBn
					: this.hadith.summary;
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
