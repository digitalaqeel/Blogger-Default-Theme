document.addEventListener("DOMContentLoaded", function () {

  /* ==============================
     FIND DEFAULT BLOGGER SEARCH | complete ultra-fast mobile fullscreen AJAX search system for default Blogger
  ============================== */
  const defaultInput = document.querySelector(".search-input input[name='q']");
  if (!defaultInput) return;

  /* ==============================
     CREATE FULLSCREEN OVERLAY
  ============================== */
  const overlay = document.createElement("div");
  overlay.className = "search-overlay";

  overlay.innerHTML = `
    <div class="search-overlay-header">
      <input type="text" placeholder="Search articles..." id="overlaySearchInput">
      <button class="search-close">Close</button>
    </div>
    <div class="search-results" id="overlayResults"></div>
  `;

  document.body.appendChild(overlay);

  const overlayInput = document.getElementById("overlaySearchInput");
  const resultsBox = document.getElementById("overlayResults");

  /* ==============================
     CSS INJECTION (AUTO)
  ============================== */
  const style = document.createElement("style");
  style.innerHTML = `
  .search-overlay{
    position:fixed;inset:0;background:#fff;z-index:99999;
    display:none;flex-direction:column;
  }
  .search-overlay.active{display:flex;}
  .search-overlay-header{
    padding:15px;border-bottom:1px solid #eee;
    display:flex;gap:10px;
  }
  .search-overlay input{
    flex:1;padding:12px;border-radius:30px;
    border:1px solid #ddd;outline:none;
  }
  .search-close{
    background:#f1f5f9;border:none;
    padding:8px 14px;border-radius:20px;
    cursor:pointer;
  }
  .search-results{flex:1;overflow-y:auto;padding:12px;}
  .search-item{
    display:flex;gap:14px;padding:12px;
    border-radius:14px;margin-bottom:8px;
    transition:.2s;
  }
  .search-item:hover{background:#f5f7fb;}
  .search-item img{
    width:75px;height:75px;
    border-radius:14px;object-fit:cover;
  }
  .search-highlight{
    background:#ffeaa7;border-radius:4px;padding:2px 4px;
  }
  .search-label{
    background:#eef2ff;color:#4f46e5;
    font-size:10px;padding:4px 8px;
    border-radius:20px;margin-right:6px;
  }
  .search-pagination{text-align:center;padding:10px;}
  `;
  document.head.appendChild(style);

  /* ==============================
     SEARCH SYSTEM
  ============================== */

  const searchCache = new Map();
  let controller = null;
  let debounceTimer;
  let currentPosts = [];
  let currentPage = 0;
  const resultsPerPage = 5;

  function debounce(callback, delay) {
    return (...args) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => callback.apply(this, args), delay);
    };
  }

  function highlight(text, query) {
    const regex = new RegExp("(" + query + ")", "gi");
    return text.replace(regex, '<span class="search-highlight">$1</span>');
  }

  function compressPosts(entries) {
    return entries.map(post => ({
      t: post.title.$t,
      l: post.link.find(x => x.rel === "alternate").href,
      s: (post.summary?.$t || "")
            .replace(/<[^>]*>?/gm, "")
            .substring(0,120),
      i: post.media$thumbnail
            ? post.media$thumbnail.url.replace("s72-c","s300")
            : "",
      c: post.category
            ? post.category.slice(0,3).map(cat => cat.term)
            : []
    }));
  }

  function render(query) {
    resultsBox.innerHTML = "";

    if (!currentPosts.length) {
      resultsBox.innerHTML = "<p>No results found</p>";
      return;
    }

    const start = currentPage * resultsPerPage;
    const posts = currentPosts.slice(start, start + resultsPerPage);

    posts.forEach(post => {

      const title = highlight(post.t, query);
      const link = post.l;
      const summary = highlight(post.s + "...", query);

      const labels = post.c
        .map(label => `<span class="search-label">${label}</span>`)
        .join("");

      resultsBox.innerHTML += `
        <div class="search-item" onclick="location.href='${link}'">
          ${post.i ? `<img src="${post.i}">` : ""}
          <div>
            <div><strong>${title}</strong></div>
            <div style="font-size:12px;color:#777">${summary}</div>
            <div>${labels}</div>
          </div>
        </div>
      `;
    });

    const totalPages = Math.ceil(currentPosts.length / resultsPerPage);

    if (totalPages > 1) {
      resultsBox.innerHTML += `
        <div class="search-pagination">
          ${currentPage > 0 ? "<button id='prevBtn'>← Prev</button>" : ""}
          ${currentPage < totalPages - 1 ? "<button id='nextBtn'>Next →</button>" : ""}
        </div>
      `;

      document.getElementById("prevBtn")?.addEventListener("click", e => {
        e.stopPropagation();
        currentPage--;
        render(query);
      });

      document.getElementById("nextBtn")?.addEventListener("click", e => {
        e.stopPropagation();
        currentPage++;
        render(query);
      });
    }
  }

  const fetchResults = debounce(function(query) {

    if (searchCache.has(query)) {
      currentPosts = searchCache.get(query);
      currentPage = 0;
      render(query);
      return;
    }

    const stored = localStorage.getItem("blogSearch_" + query);
    if (stored) {
      currentPosts = JSON.parse(stored);
      searchCache.set(query, currentPosts);
      currentPage = 0;
      render(query);
      return;
    }

    if (controller) controller.abort();
    controller = new AbortController();

    fetch(`/feeds/posts/summary?alt=json&q=${encodeURIComponent(query)}&max-results=25`, {
      signal: controller.signal
    })
    .then(res => res.json())
    .then(data => {

      const entries = data.feed.entry || [];
      const compressed = compressPosts(entries);

      currentPosts = compressed;
      searchCache.set(query, compressed);
      localStorage.setItem("blogSearch_" + query, JSON.stringify(compressed));

      currentPage = 0;
      render(query);
    });

  }, 250);

  /* ==============================
     EVENTS
  ============================== */

  defaultInput.addEventListener("focus", function(e){
    e.preventDefault();
    overlay.classList.add("active");
    overlayInput.focus();
  });

  overlay.querySelector(".search-close").addEventListener("click", function(){
    overlay.classList.remove("active");
  });

  overlayInput.addEventListener("input", function(){
    const query = this.value.trim();
    if (query.length < 2) return;
    fetchResults(query);
  });

});
