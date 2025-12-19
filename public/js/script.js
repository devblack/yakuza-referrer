const LoadingManager = {
  overlay: null,
  minDisplayTime: 2500,
  loadStartTime: null,
  loadingMessages: [
    "Decrypting the secrets . . .",
    "Cracking the cipher . . .",
    "Breaking the code . . .",
    "Unscrambling the data . . .",
    "Reversing the encryption . . .",
    "Decoding the matrix . . .",
    "Unlocking the vault . . .",
    "Solving the cryptogram . . .",
    "Bypassing the firewall . . .",
    "Extracting the payload . . .",
    "Analyzing the hash . . .",
    "Brute forcing the key . . .",
    "Deciphering ancient runes . . .",
    "Cracking RSA encryption . . .",
    "Running rainbow tables . . .",
    "XORing the bits . . .",
    "Rotating Caesar ciphers . . .",
    "Breaking substitution codes . . .",
    "Decrypting AES blocks . . .",
    "Unwrapping the enigma . . .",
  ],

  getRandomMessage() {
    return this.loadingMessages[
      Math.floor(Math.random() * this.loadingMessages.length)
    ];
  },

  init() {
    this.loadStartTime = Date.now();

    document.addEventListener("DOMContentLoaded", () => {
      this.overlay = document.getElementById("loadingOverlay");
      this.setStatus(this.getRandomMessage());
    });

    window.addEventListener("load", () => {
      this.hideLoader();
    });
  },

  printTerminal(selector, message) {
    // document.querySelector(".log:first-child")?.insertAdjacentHTML("afterbegin", "<p><log>test:<log> <response>test :D</response></p>");
    document
      .querySelector(selector)
      ?.insertAdjacentHTML("beforeend", "<p>" + message + "</p>");
  },

  setStatus(message) {
    this.printTerminal(".status", message);
  },

  setTitle(title) {
    document.title = title;
  },

  showLoader(message) {
    if (this.overlay) {
      this.overlay.classList.remove("hidden");
      this.setStatus(message);
      this.setTitle("Loading . . .");
    }
  },

  hideLoader() {
    const elapsed = Date.now() - this.loadStartTime;
    const remainingTime = Math.max(0, this.minDisplayTime - elapsed);

    setTimeout(() => {
      if (this.overlay) {
        this.overlay.classList.add("hidden");
        //this.setTitle('Loaded');
        //this.setStatus('Decryption done . . .');
      }
    }, remainingTime);
  },
};

LoadingManager.init();
