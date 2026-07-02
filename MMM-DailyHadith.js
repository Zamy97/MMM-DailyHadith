Module.register("MMM-DailyHadith", {
	defaults: {
		showTitle: true,
		showArabic: true,
		showTranslation: true,
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
			en: "translations/en.json"
		};
	},

	requestHadith() {
		this.sendSocketNotification("GET_HADITH", {
			dataFile: this.config.dataFile,
			rotationMode: this.config.rotationMode
		});
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
			const title = document.createElement("div");
			title.className = "hadith-title bright small light";
			title.innerHTML = this.translate("TITLE");
			wrapper.appendChild(title);
		}

		if (this.config.showArabic && this.hadith.arabic) {
			const arabic = document.createElement("div");
			arabic.className = "hadith-arabic bright medium light";
			arabic.innerHTML = this.hadith.arabic;
			wrapper.appendChild(arabic);
		}

		if (this.config.showTranslation) {
			const translation = document.createElement("div");
			translation.className = "hadith-translation bright small light";

			let html = "";
			if (this.config.showNarrator && this.hadith.narrator) {
				html += `<span class="hadith-narrator">${this.hadith.narrator}</span> `;
			}
			if (this.hadith.text) {
				html += this.hadith.text;
			}

			translation.innerHTML = html;
			wrapper.appendChild(translation);
		}

		if (this.config.showReference && this.hadith.reference) {
			const reference = document.createElement("div");
			reference.className = "hadith-reference dimmed xsmall light";
			reference.innerHTML = this.hadith.reference;
			wrapper.appendChild(reference);
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
