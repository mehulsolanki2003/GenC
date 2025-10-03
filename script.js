// --- Firebase and Auth Initialization ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBWDZZ-zLYyCrvnnnTeZ1w_IBWQvTrf-hM",
  authDomain: "gena-c597d.firebaseapp.com",
  projectId: "gena-c597d",
  storageBucket: "gena-c597d.firebasestorage.app",
  messagingSenderId: "926192855864",
  appId: "1:926192855864:web:728ec3e47624fe2d672fcd",
  measurementId: "G-SYK9TMY47N"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// --- Global State ---
let currentUser;
let currentUserCredits = 0;
let isGenerating = false;
let currentAspectRatio = '1:1';
let uploadedImageData = null;
let currentPreviewInputData = null; 
let timerInterval;

// --- DOM Element Caching ---
const DOMElements = {};

document.addEventListener('DOMContentLoaded', () => {
    const ids = [
        'header-nav', 'gallery-container', 'masonry-gallery', 'prompt-input',
        'generate-btn', 'generate-icon', 'loading-spinner', 'ratio-btn', 'ratio-options',
        'auth-modal', 'google-signin-btn', 'out-of-credits-modal', 
        'preview-modal', 'preview-image', 'preview-prompt-input',
        'download-btn', 'close-preview-btn', 'regenerate-btn',
        'image-upload-btn', 'image-upload-input', 'image-preview-container', 'image-preview', 'remove-image-btn',
        'preview-input-image-container', 'preview-input-image', 'change-input-image-btn', 'remove-input-image-btn', 'preview-image-upload-input',
        'hero-section', 'hero-headline', 'hero-subline', 'typewriter', 'prompt-bar-container',
        'mobile-menu', 'mobile-menu-btn', 'menu-open-icon', 'menu-close-icon',
        'button-timer', 'button-content'
    ];
    ids.forEach(id => {
        if (id) {
            DOMElements[id.replace(/-./g, c => c[1].toUpperCase())] = document.getElementById(id);
        }
    });
    DOMElements.closeModalBtns = document.querySelectorAll('.close-modal-btn');
    DOMElements.ratioOptionBtns = document.querySelectorAll('.ratio-option');
    DOMElements.masonryColumns = document.querySelectorAll('.masonry-column');
    DOMElements.statCards = document.querySelectorAll('.stat-card');
    DOMElements.counters = document.querySelectorAll('.counter');

    initializeEventListeners();
    initializeAnimations();
    onAuthStateChanged(auth, user => updateUIForAuthState(user));
    restructureGalleryForMobile();
});

function restructureGalleryForMobile() {
    if (window.innerWidth >= 768) return;
    const firstColumn = DOMElements.masonryColumns[0];
    if (!firstColumn) return;
    for (let i = 1; i < DOMElements.masonryColumns.length; i++) {
        const column = DOMElements.masonryColumns[i];
        while (column.firstChild) {
            firstColumn.appendChild(column.firstChild);
        }
    }
}

function initializeEventListeners() {
    DOMElements.googleSignInBtn?.addEventListener('click', signInWithGoogle);
    DOMElements.closeModalBtns.forEach(btn => btn.addEventListener('click', closeAllModals));
    DOMElements.generateBtn?.addEventListener('click', handleImageGenerationRequest);
    
    DOMElements.promptInput?.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            handleImageGenerationRequest();
        }
    });

    DOMElements.promptInput?.addEventListener('input', autoResizeTextarea);
    
    DOMElements.imageUploadBtn?.addEventListener('click', () => DOMElements.imageUploadInput.click());
    DOMElements.imageUploadInput?.addEventListener('change', handleImageUpload);
    DOMElements.removeImageBtn?.addEventListener('click', removeUploadedImage);

    DOMElements.ratioBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!DOMElements.ratioBtn.disabled) {
            DOMElements.ratioOptions.classList.toggle('hidden');
        }
    });
    document.addEventListener('click', () => DOMElements.ratioOptions?.classList.add('hidden'));
    DOMElements.ratioOptionBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            currentAspectRatio = e.currentTarget.dataset.ratio;
            DOMElements.ratioOptionBtns.forEach(b => b.classList.remove('selected'));
            e.currentTarget.classList.add('selected');
        });
    });

    DOMElements.closePreviewBtn?.addEventListener('click', () => toggleModal(DOMElements.previewModal, false));
    DOMElements.downloadBtn?.addEventListener('click', downloadPreviewImage);
    DOMElements.regenerateBtn?.addEventListener('click', handleRegeneration);
    DOMElements.changeInputImageBtn?.addEventListener('click', () => DOMElements.previewImageUploadInput.click());
    DOMElements.previewImageUploadInput?.addEventListener('change', handlePreviewImageChange);
    DOMElements.removeInputImageBtn?.addEventListener('click', removePreviewInputImage);
    
    DOMElements.mobileMenuBtn?.addEventListener('click', () => {
        const isHidden = DOMElements.mobileMenu.classList.toggle('hidden');
        DOMElements.menuOpenIcon.classList.toggle('hidden', !isHidden);
        DOMElements.menuCloseIcon.classList.toggle('hidden', isHidden);
    });

    window.addEventListener('scroll', () => {
        const header = document.querySelector('header');
        if (window.scrollY > 10) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });
}

// --- Animations ---
function initializeAnimations() {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;
    
    gsap.registerPlugin(ScrollTrigger, TextPlugin);

    // Simple fade-in for hero headline
    gsap.fromTo(DOMElements.heroHeadline, 
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 1, ease: 'power3.out', delay: 0.2 }
    );

    gsap.fromTo(DOMElements.heroSubline, 
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 1, ease: 'power3.out', delay: 0.4 }
    );

    const words = ["creators.", "agencies.", "enterprises."];
    let masterTl = gsap.timeline({ repeat: -1 });
    words.forEach(word => {
        let tl = gsap.timeline({ repeat: 1, yoyo: true, repeatDelay: 1.5 });
        tl.to("#typewriter", { text: word, duration: 1, ease: "none" });
        masterTl.add(tl);
    });
    
    if (DOMElements.statCards.length > 0) {
        gsap.fromTo(DOMElements.statCards, 
            { opacity: 0, y: 30, scale: 0.95 },
            { 
                opacity: 1, y: 0, scale: 1, duration: 1, stagger: 0.15, ease: 'power3.out',
                scrollTrigger: {
                    trigger: "#stats-section",
                    start: "top 85%",
                }
            }
        );
    }

    if (DOMElements.counters.length > 0) {
        DOMElements.counters.forEach(counter => {
            const target = +counter.dataset.target;
            const proxy = { val: 0 }; 

            gsap.to(proxy, {
                val: target,
                duration: 2.5,
                ease: "power2.out",
                scrollTrigger: {
                    trigger: counter,
                    start: "top 90%",
                },
                onUpdate: function() {
                    counter.textContent = Math.ceil(proxy.val);
                }
            });
        });
    }

    // Testimonial Animation
    const testimonialSection = document.getElementById('testimonial-section');
    if(testimonialSection) {
        gsap.from(testimonialSection.querySelectorAll(".testimonial-image, .testimonial-card"), {
            opacity: 0,
            y: 50,
            duration: 1,
            stagger: 0.2,
            ease: 'power3.out',
            scrollTrigger: {
                trigger: testimonialSection,
                start: "top 80%",
            }
        });
    }

    // Dynamic Use Cases Scroll Animation
    const useCasesSection = document.getElementById('use-cases-section');
    const useCaseTexts = gsap.utils.toArray('.use-case-text');

    if (useCasesSection && useCaseTexts.length > 0) {
        const tl = gsap.timeline();
        
        // Animate the first item in
        tl.to(useCaseTexts[0], { opacity: 1, y: 0, duration: 0.3 });

        // Loop through the rest to create transitions
        for (let i = 1; i < useCaseTexts.length; i++) {
            tl.to(useCaseTexts[i-1], { opacity: 0, y: -30, duration: 0.3 }, "+=0.4"); // Animate out previous
            tl.to(useCaseTexts[i], { opacity: 1, y: 0, duration: 0.3 }); // Animate in current
        }
        
        // Animate the last one out
        tl.to(useCaseTexts[useCaseTexts.length - 1], { opacity: 0, y: -30, duration: 0.3 }, "+=0.4");

        ScrollTrigger.create({
            trigger: useCasesSection,
            start: "top top",
            end: "bottom bottom",
            pin: true,
            scrub: 0.5,
            animation: tl,
        });
    }
}


// --- Core App Logic ---
function updateUIForAuthState(user) {
    currentUser = user;
    const nav = DOMElements.headerNav;
    const mobileNav = DOMElements.mobileMenu;

    if (user) {
        nav.innerHTML = `
            <a href="pricing.html" class="text-sm font-medium text-gray-700 hover:bg-[#517CBE]/10 rounded-full px-3 py-1 transition-colors">Pricing</a>
            <div id="credits-counter" class="text-sm font-medium text-gray-700 px-3 py-1">Credits: ...</div>
            <button id="sign-out-btn-desktop" class="text-sm font-medium text-gray-700 hover:bg-[#517CBE]/10 rounded-full px-3 py-1 transition-colors">Sign Out</button>
        `;
        mobileNav.innerHTML = `
            <a href="pricing.html" class="block text-lg font-semibold text-gray-700 p-3 rounded-lg hover:bg-gray-100">Pricing</a>
            <div id="credits-counter-mobile" class="text-center text-lg font-semibold text-gray-700 p-3 my-2 border-y">Credits: ...</div>
            <button id="sign-out-btn-mobile" class="w-full text-left text-lg font-semibold text-gray-700 p-3 rounded-lg hover:bg-gray-100">Sign Out</button>
        `;
        document.getElementById('sign-out-btn-desktop').addEventListener('click', () => signOut(auth));
        document.getElementById('sign-out-btn-mobile').addEventListener('click', () => signOut(auth));
        fetchUserCredits(user);
    } else {
        nav.innerHTML = `
            <a href="pricing.html" class="text-sm font-medium text-gray-700 hover:bg-[#517CBE]/10 rounded-full px-3 py-1 transition-colors">Pricing</a>
            <button id="sign-in-btn-desktop" class="text-sm font-medium text-white px-4 py-1.5 rounded-full transition-colors" style="background-color: #517CBE;">Sign In</button>
        `;
         mobileNav.innerHTML = `
            <a href="pricing.html" class="block text-lg font-semibold text-gray-700 p-3 rounded-lg hover:bg-gray-100">Pricing</a>
            <div class="p-4 mt-4">
                 <button id="sign-in-btn-mobile" class="w-full text-lg font-semibold bg-[#517CBE] text-white px-4 py-3 rounded-xl hover:bg-opacity-90 transition-colors">Sign In</button>
            </div>
        `;
        document.getElementById('sign-in-btn-desktop').addEventListener('click', signInWithGoogle);
        document.getElementById('sign-in-btn-mobile').addEventListener('click', signInWithGoogle);
    }
}

async function fetchUserCredits(user) {
    try {
        const token = await user.getIdToken(true);
        const response = await fetch('/api/credits', { headers: { 'Authorization': `Bearer ${token}` } });
        if (!response.ok) throw new Error('Failed to fetch credits');
        const data = await response.json();
        currentUserCredits = data.credits;
        updateCreditsDisplay(currentUserCredits);
    } catch (error) {
        console.error("Error fetching credits:", error);
        updateCreditsDisplay('Error');
    }
}

function updateCreditsDisplay(amount) {
    const creditsCounter = document.getElementById('credits-counter');
    const creditsCounterMobile = document.getElementById('credits-counter-mobile');
    if (creditsCounter) creditsCounter.textContent = `Credits: ${amount}`;
    if (creditsCounterMobile) creditsCounterMobile.textContent = `Credits: ${amount}`;
}

function autoResizeTextarea(e) {
    const textarea = e.target;
    const promptBarContainer = DOMElements.promptBarContainer;
    if (!textarea || !promptBarContainer) return;

    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;

    const lineHeight = parseFloat(window.getComputedStyle(textarea).lineHeight);
    const numLines = Math.round(textarea.scrollHeight / lineHeight);

    if (numLines > 1) { 
        promptBarContainer.classList.add('expanded');
    } else {
        promptBarContainer.classList.remove('expanded');
    }
}

function toggleModal(modal, show) {
    if (!modal) return;
    if (show) {
        modal.style.display = 'flex';
        setTimeout(() => modal.setAttribute('aria-hidden', 'false'), 10);
    } else {
        modal.setAttribute('aria-hidden', 'true');
        setTimeout(() => modal.style.display = 'none', 300);
    }
}

function closeAllModals() {
    document.querySelectorAll('[role="dialog"]').forEach(modal => toggleModal(modal, false));
}

function signInWithGoogle() {
    signInWithPopup(auth, provider).catch(console.error);
}

// --- Image Generation ---
async function handleImageGenerationRequest(promptOverride = null, fromRegenerate = false) {
    if (isGenerating) return;
    if (!currentUser) {
        toggleModal(DOMElements.authModal, true);
        return;
    }
    if (currentUserCredits <= 0) {
        toggleModal(DOMElements.outOfCreditsModal, true);
        return;
    }

    const imageDataSource = fromRegenerate ? currentPreviewInputData : uploadedImageData;
    const prompt = fromRegenerate ? promptOverride : DOMElements.promptInput.value.trim();

    if (!prompt && !imageDataSource) {
        const promptBar = DOMElements.promptInput.parentElement;
        promptBar.classList.add('animate-shake');
        setTimeout(() => promptBar.classList.remove('animate-shake'), 500);
        return;
    }

    isGenerating = true;
    setLoadingState(true);
    startTimer();
    
    const aspectRatioToSend = imageDataSource ? null : currentAspectRatio;
    const generationInputData = imageDataSource ? {...imageDataSource} : null;

    try {
        const token = await currentUser.getIdToken();
        
        const deductResponse = await fetch('/api/credits', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!deductResponse.ok) throw new Error('Credit deduction failed. Please try again.');
        
        const creditData = await deductResponse.json();
        currentUserCredits = creditData.newCredits;
        updateCreditsDisplay(currentUserCredits);

        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ prompt, imageData: generationInputData, aspectRatio: aspectRatioToSend })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API generation failed: ${errorText}`);
        }
        
        const result = await response.json();
        const base64Data = generationInputData
            ? result?.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data 
            : result.predictions?.[0]?.bytesBase64Encoded;
            
        if (!base64Data) throw new Error("No image data in API response");
        
        const imageUrl = `data:image/png;base64,${base64Data}`;
        
        showPreviewModal(imageUrl, prompt, generationInputData);

    } catch (error) {
        console.error("Generation Error:", error);
        alert(`An error occurred during generation: ${error.message}`);
    } finally {
        clearInterval(timerInterval);
        setLoadingState(false);
        if(!fromRegenerate) {
            DOMElements.promptInput.value = '';
            autoResizeTextarea({target: DOMElements.promptInput});
            removeUploadedImage();
        }
    }
}

async function handleRegeneration() {
    const newPrompt = DOMElements.previewPromptInput.value;
    if (!newPrompt && !currentPreviewInputData) return;
    
    toggleModal(DOMElements.previewModal, false);
    await handleImageGenerationRequest(newPrompt, true);
}

function setLoadingState(isLoading) {
    isGenerating = isLoading;
    DOMElements.generateBtn.disabled = isLoading;
    DOMElements.buttonContent.classList.toggle('hidden', isLoading);
    DOMElements.buttonTimer.classList.toggle('hidden', !isLoading);
}

function startTimer() {
    let endTime = Date.now() + 17000;
    DOMElements.buttonTimer.textContent = '17.00';
    
    timerInterval = setInterval(() => {
        const remaining = endTime - Date.now();
        if (remaining <= 0) {
            clearInterval(timerInterval);
            DOMElements.buttonTimer.textContent = '0.00';
            return;
        }
        DOMElements.buttonTimer.textContent = (remaining / 1000).toFixed(2);
    }, 50); // Update every 50ms for smoother millisecond display
}

// --- Image Handling & Uploads ---
function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
        const base64String = reader.result.split(',')[1];
        uploadedImageData = { mimeType: file.type, data: base64String };
        DOMElements.imagePreview.src = reader.result;
        DOMElements.imagePreviewContainer.classList.remove('hidden');
        DOMElements.ratioBtn.disabled = true;
        DOMElements.ratioBtn.classList.add('opacity-50', 'cursor-not-allowed');
    };
    reader.readAsDataURL(file);
}

function removeUploadedImage() {
    uploadedImageData = null;
    DOMElements.imageUploadInput.value = '';
    DOMElements.imagePreview.src = '';
    DOMElements.imagePreviewContainer.classList.add('hidden');
    DOMElements.ratioBtn.disabled = false;
    DOMElements.ratioBtn.classList.remove('opacity-50', 'cursor-not-allowed');
}

// --- Preview Modal ---
function showPreviewModal(imageUrl, prompt, inputImageData) {
    DOMElements.previewImage.src = imageUrl;
    DOMElements.previewPromptInput.value = prompt;
    currentPreviewInputData = inputImageData;

    if (inputImageData) {
        const dataUrl = `data:${inputImageData.mimeType};base64,${inputImageData.data}`;
        DOMElements.previewInputImage.src = dataUrl;
        DOMElements.previewInputImageContainer.classList.remove('hidden');
    } else {
        DOMElements.previewInputImageContainer.classList.add('hidden');
    }
    toggleModal(DOMElements.previewModal, true);
}

function handlePreviewImageChange(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
        const base64String = reader.result.split(',')[1];
        currentPreviewInputData = { mimeType: file.type, data: base64String };
        DOMElements.previewInputImage.src = reader.result;
    };
    reader.readAsDataURL(file);
}

function removePreviewInputImage() {
    currentPreviewInputData = null;
    DOMElements.previewImageUploadInput.value = '';
    DOMElements.previewInputImage.src = '';
    DOMElements.previewInputImageContainer.classList.add('hidden');
}

function downloadPreviewImage() {
    const imageUrl = DOMElements.previewImage.src;
    fetch(imageUrl)
        .then(res => res.blob())
        .then(blob => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = 'genart-image.png';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        })
        .catch(() => alert('An error occurred while downloading the image.'));
}






// DARK MODE TOGGLE
const darkModeToggle = document.getElementById('dark-mode-toggle');

// Load saved preference on page load
if(localStorage.getItem('darkMode') === 'enabled') {
    document.documentElement.classList.add('dark');
    darkModeToggle.textContent = '☀️';
} else {
    darkModeToggle.textContent = '🌙';
}


// Toggle dark mode on button click
darkModeToggle.addEventListener('click', () => {
    document.documentElement.classList.toggle('dark');

    if(document.documentElement.classList.contains('dark')) {
        localStorage.setItem('darkMode', 'enabled');
        darkModeToggle.textContent = '☀️'; // sun icon
    } else {
        localStorage.setItem('darkMode', 'disabled');
        darkModeToggle.textContent = '🌙'; // moon icon
    }
});

// --- AI Tutorials / Inspiration ---

const tutorialsData = {
  promptExamples: [
    { 
      prompt: "A streetwear outfit in cyberpunk Tokyo at night", 
      note: "Good for edgy AI fashion inspiration." 
    },
    { 
      prompt: "Professional studio shot of a model wearing a summer dress", 
      note: "Clean fashion catalog vibes." 
    },
    { 
      prompt: "Artistic portrait in watercolor style, elegant gown", 
      note: "Great for experimental art direction." 
    }
  ],
  aiGallery: [
    { img: "p1.png", desc: "Futuristic neon jacket" },
    { img: "p2.png", desc: "Luxury fashion gown" },
    { img: "p3.png", desc: "Streetwear in Tokyo" },
    { img: "p4.png", desc: "A streetwear outfit in cyberpunk Tokyo at night" }
  ]
};

function renderAITutorials() {
  // Prompt Examples
  const promptContainer = document.getElementById("prompt-examples");
  if (promptContainer) {
    tutorialsData.promptExamples.forEach(ex => {
      const div = document.createElement("div");
      div.className = "p-4 bg-white dark:bg-gray-800 rounded-xl shadow flex flex-col justify-between";
      div.innerHTML = `
        <div>
          <p class="text-gray-800 dark:text-gray-100 font-medium">"${ex.prompt}"</p>
          <p class="text-sm text-gray-500 dark:text-gray-400 mb-3">${ex.note}</p>
        </div>
        <button class="try-btn w-full px-3 py-2 mt-auto bg-[#517CBE] text-white rounded-lg hover:bg-opacity-90 transition">
          Try Now
        </button>
      `;
      // Add event listener for "Try Now"
      div.querySelector(".try-btn").addEventListener("click", () => {
        const input = document.getElementById("prompt-input");
        if (input) {
          input.value = ex.prompt;
          input.focus();
          // auto resize if your function exists
          if (typeof autoResizeTextarea === "function") {
            autoResizeTextarea({ target: input });
          }
        }
      });
      promptContainer.appendChild(div);
    });
  }

  // AI Gallery
  const aiGallery = document.getElementById("ai-gallery");
  if (aiGallery) {
    tutorialsData.aiGallery.forEach(imgData => {
      const div = document.createElement("div");
      div.className = "overflow-hidden rounded-xl shadow bg-white dark:bg-gray-800";
      div.innerHTML = `
        <img src="${imgData.img}" alt="${imgData.desc}" class="w-full h-65 object-cover">
        <p class="p-3 text-sm text-gray-600 dark:text-gray-300">${imgData.desc}</p>
      `;
      aiGallery.appendChild(div);
    });
  }
}

document.addEventListener("DOMContentLoaded", renderAITutorials);

// -----------------------------
// Dynamic AI Image Showcase
// -----------------------------
const aiImages = [
  { src: "p1.png", desc: "Cinematic interior design" },
  { src: "p2.png", desc: "Luxury hotel lobby" },
  { src: "p3.png", desc: "Futuristic fashion portrait" },
  { src: "p4.png", desc: "Cyberpunk streetwear" },
  { src: "p1.png", desc: "Architectural concept" },
  { src: "p2.png", desc: "Modern living room" },
  { src: "p3.png", desc: "Golden chandelier" },
  { src: "p4.png", desc: "High-end lounge" }
];

// Grid settings
const gridContainer = document.getElementById("ai-grid");
const visibleSlots = 8; // number of slots shown in grid
let currentIndex = 0;

// Initialize grid
function renderGrid() {
  gridContainer.innerHTML = "";
  for (let i = 0; i < visibleSlots; i++) {
    const imgData = aiImages[(currentIndex + i) % aiImages.length];
    const div = document.createElement("div");
    div.className = "relative overflow-hidden rounded-xl shadow-lg border-2 border-gray-700 group cursor-pointer";
    div.innerHTML = `
      <img src="${imgData.src}" alt="${imgData.desc}" 
        class="w-full h-48 object-cover transition duration-500 transform group-hover:scale-105">
      <div class="absolute bottom-0 w-full bg-gradient-to-t from-black/80 to-transparent p-2">
        <p class="text-xs text-gray-200">${imgData.desc}</p>
      </div>
    `;
    // Click to open modal
    div.addEventListener("click", () => openModal(imgData.src, imgData.desc));
    gridContainer.appendChild(div);
  }
}

// Auto update one image slot at a time
function autoUpdateGrid() {
  const slots = gridContainer.children;
  if (!slots.length) return;

  const randomSlot = Math.floor(Math.random() * slots.length);
  currentIndex = (currentIndex + 1) % aiImages.length;
  const newImgData = aiImages[currentIndex];

  const slot = slots[randomSlot];
  const img = slot.querySelector("img");
  const caption = slot.querySelector("p");

  img.style.opacity = 0;
  setTimeout(() => {
    img.src = newImgData.src;
    caption.textContent = newImgData.desc;
    img.style.opacity = 1;
  }, 500);

  // Update click handler for modal
  slot.onclick = () => openModal(newImgData.src, newImgData.desc);
}

// Modal functionality
const modal = document.getElementById("image-modal");
const modalImg = document.getElementById("modal-img");
const modalCaption = document.getElementById("modal-caption");
const closeModalBtn = document.getElementById("close-modal");

function openModal(src, desc) {
  modal.classList.remove("hidden");
  modal.classList.add("flex");
  modalImg.src = src;
  modalCaption.textContent = desc;
}

function closeModal() {
  modal.classList.remove("flex");
  modal.classList.add("hidden");
}

closeModalBtn.addEventListener("click", closeModal);
modal.addEventListener("click", (e) => {
  if (e.target === modal) closeModal();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
});

// Run on load
document.addEventListener("DOMContentLoaded", () => {
  renderGrid();
  setInterval(autoUpdateGrid, 3000);
});



const showcaseItems = {
    "Luxury Hotel Lobby": "https://iili.io/K7bN7Hl.png",
    "Modern Architecture Skyline": "https://iili.io/K7b6OPV.png",
    "Elegant Fashion Runway": "https://iili.io/K7bOTzP.png",
    "Minimalist Interior Design": "https://iili.io/K7yYoqN.png",
    "Futuristic Cityscape": "https://iili.io/K7b894e.png",
    "Luxury Bar Lounge": "https://iili.io/K7bk3Ku.png",
  };

  const words = document.querySelectorAll(".carousel-track .word");
  const imageEl = document.getElementById("showcase-image");
  let currentIndex = 0;

  function highlightWord() {
    // Remove old highlight
    words.forEach(w => w.classList.remove("highlight"));

    // Highlight current word
    const word = words[currentIndex % words.length];
    word.classList.add("highlight");

    // Update image
    const text = word.textContent.trim();
    if (showcaseItems[text]) {
      imageEl.style.opacity = 0;
      setTimeout(() => {
        imageEl.src = showcaseItems[text];
        imageEl.style.opacity = 1;
      }, 300);
    }

    currentIndex++;
  }

  // Highlight a new word every 2 seconds
  setInterval(highlightWord, 2000);

  // Initialize first word
  highlightWord();


















