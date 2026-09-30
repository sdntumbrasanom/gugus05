const $ = id => document.getElementById(id);

let state = {
  user: null,
  projects: [],
  current: null
};


/* =========================================================
   UTILITIES
========================================================= */

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[c]));
}


function show(id) {

  [
    "loginView",
    "registerView",
    "dashboardView",
    "adminView"
  ].forEach(x => {

    const el = $(x);

    if (el) {
      el.classList.add("hidden");
    }

  });

  const target = $(id);

  if (target) {
    target.classList.remove("hidden");
  }
}


function msg(el, text, type = "") {

  if (!el) return;

  el.innerHTML = text
    ? `<div class="msg ${type}">${escapeHtml(text)}</div>`
    : "";
}


function token() {

  return (
    localStorage.getItem(
      "deploy_token"
    ) || ""
  );
}


/* =========================================================
   API
========================================================= */

async function api(action, data = {}) {

  if (
    typeof API_URL === "undefined" ||
    !API_URL ||
    API_URL.includes("PASTE_")
  ) {

    throw new Error(
      "API_URL belum diatur di config.js"
    );
  }


  /*
   * saveProject dan deploy menggunakan POST
   * karena isi HTML bisa sangat panjang.
   *
   * Action lain menggunakan GET.
   */

  const isPost =
    action === "saveProject" ||
    action === "deploy";


  let response;


  try {

    if (isPost) {

      const body =
        new URLSearchParams();

      body.append(
        "action",
        action
      );


      Object.entries(data)
        .forEach(([key, value]) => {

          body.append(
            key,
            value === undefined ||
            value === null
              ? ""
              : String(value)
          );

        });


      response =
        await fetch(
          API_URL,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/x-www-form-urlencoded;charset=UTF-8"
            },

            body:
              body.toString()
          }
        );


    } else {

      const params =
        new URLSearchParams();

      params.append(
        "action",
        action
      );


      Object.entries(data)
        .forEach(([key, value]) => {

          params.append(
            key,
            value === undefined ||
            value === null
              ? ""
              : String(value)
          );

        });


      response =
        await fetch(
          API_URL +
          "?" +
          params.toString(),
          {
            method: "GET"
          }
        );

    }


  } catch (error) {

    console.error(
      "API FETCH ERROR:",
      error
    );

    throw new Error(
      "Gagal terhubung ke server. Periksa koneksi atau API."
    );
  }


  if (!response.ok) {

    console.error(
      "API HTTP ERROR:",
      response.status,
      response.statusText
    );

    throw new Error(
      `Server mengembalikan error ${response.status}.`
    );
  }


  let result;


  try {

    result =
      await response.json();

  } catch (error) {

    console.error(
      "INVALID JSON RESPONSE:",
      error
    );

    throw new Error(
      "Server memberikan respons yang tidak valid."
    );
  }


  if (!result.ok) {

    throw new Error(
      result.error ||
      "Terjadi kesalahan pada server."
    );
  }


  return result;
}


async function apiAuth(
  action,
  data = {}
) {

  return api(
    action,
    {
      ...data,
      token: token()
    }
  );
}


/* =========================================================
   LOGIN / REGISTER
========================================================= */

if ($("showRegister")) {

  $("showRegister").onclick =
    () => show(
      "registerView"
    );
}


if ($("showLogin")) {

  $("showLogin").onclick =
    () => show(
      "loginView"
    );
}


function logout() {

  localStorage.removeItem(
    "deploy_token"
  );

  state = {
    user: null,
    projects: [],
    current: null
  };

  show("loginView");
}


if ($("logoutBtn")) {

  $("logoutBtn").onclick =
    logout;
}


if ($("adminLogout")) {

  $("adminLogout").onclick =
    logout;
}


if ($("mobileLogout")) {

  $("mobileLogout").onclick =
    logout;
}


/* =========================================================
   LOGIN
========================================================= */

if ($("loginForm")) {

  $("loginForm").onsubmit =
    async e => {

      e.preventDefault();


      msg(
        $("loginMsg"),
        "Memeriksa akun..."
      );


      try {

        const r =
          await api(
            "login",
            {
              identifier:
                $("loginId").value,

              password:
                $("loginPassword").value
            }
          );


        localStorage.setItem(
          "deploy_token",
          r.token
        );


        state.user =
          r.user;


        await loadDashboard();


      } catch (error) {

        console.error(
          error
        );


        msg(
          $("loginMsg"),
          error.message,
          "error"
        );
      }

    };
}


/* =========================================================
   REGISTER
========================================================= */

if ($("registerForm")) {

  $("registerForm").onsubmit =
    async e => {

      e.preventDefault();


      msg(
        $("registerMsg"),
        "Mengirim pendaftaran..."
      );


      try {

        await api(
          "register",
          {
            name:
              $("regName").value,

            username:
              $("regUsername").value,

            email:
              $("regEmail").value,

            password:
              $("regPassword").value
          }
        );


        msg(
          $("registerMsg"),
          "Pendaftaran berhasil. Tunggu persetujuan admin.",
          "success"
        );


        e.target.reset();


      } catch (error) {

        console.error(
          error
        );


        msg(
          $("registerMsg"),
          error.message,
          "error"
        );
      }

    };
}


/* =========================================================
   DASHBOARD
========================================================= */

async function loadDashboard() {

  try {

    const r =
      await apiAuth(
        "me"
      );


    state.user =
      r.user;


    state.projects =
      Array.isArray(
        r.projects
      )
        ? r.projects
        : [];


    renderDashboard();


    show(
      "dashboardView"
    );


  } catch (error) {

    console.error(
      error
    );


    localStorage.removeItem(
      "deploy_token"
    );


    show(
      "loginView"
    );


    msg(
      $("loginMsg"),
      error.message,
      "error"
    );
  }
}


function nextSlot() {

  for (
    let i = 1;
    i <= 5;
    i++
  ) {

    if (
      !state.projects.some(
        x =>
          Number(x.slot) === i
      )
    ) {

      return i;
    }

  }


  return 1;
}


/* =========================================================
   RENDER DASHBOARD
========================================================= */

function renderDashboard() {

  const u =
    state.user;


  if (!u) return;


  if ($("hello")) {

    $("hello").textContent =
      `Halo, ${u.name}`;
  }


  if ($("sideName")) {

    $("sideName").textContent =
      u.name || "";
  }


  if ($("sideRole")) {

    $("sideRole").textContent =
      u.role || "";
  }


  if ($("avatar")) {

    $("avatar").textContent =
      (
        u.name ||
        "U"
      )[0].toUpperCase();
  }


  if ($("count")) {

    $("count").textContent =
      state.projects.length;
  }


  if ($("progress")) {

    $("progress").style.width =
      (
        state.projects.length /
        5 *
        100
      ) + "%";
  }


  const deployed =
    state.projects.filter(
      x =>
        x.deployId &&
        x.status ===
        "DEPLOYED"
    ).length;


  if ($("deployedCount")) {

    $("deployedCount").textContent =
      deployed;
  }


  const latest =
    state.projects
      .map(
        x =>
          new Date(
            x.updatedAt
          )
      )
      .filter(
        x =>
          !isNaN(x)
      )
      .sort(
        (a, b) =>
          b - a
      )[0];


  if ($("lastUpdated")) {

    $("lastUpdated").textContent =
      latest
        ? latest.toLocaleDateString(
            "id-ID",
            {
              day: "numeric",
              month: "short"
            }
          )
        : "—";
  }


  if ($("adminBtn")) {

    $("adminBtn").style.display =
      u.role === "ADMIN"
        ? "block"
        : "none";
  }


  let html = "";


  for (
    let i = 1;
    i <= 5;
    i++
  ) {

    const p =
      state.projects.find(
        x =>
          Number(x.slot) === i
      );


    if (p) {

      html += `

        <div class="project-card">

          <span class="project-num">
            KARYA ${i}
          </span>


          <div class="project-title">
            ${escapeHtml(
              p.title ||
              "Tanpa judul"
            )}
          </div>


          <span class="status ${
            p.status ===
            "DEPLOYED"
              ? "live"
              : "draft"
          }">

            ${
              p.status ===
              "DEPLOYED"
                ? "● DEPLOYED"
                : "DRAFT"
            }

          </span>


          <div class="project-date">

            ${
              p.updatedAt
                ? new Date(
                    p.updatedAt
                  ).toLocaleDateString(
                    "id-ID",
                    {
                      day:
                        "numeric",
                      month:
                        "long",
                      year:
                        "numeric"
                    }
                  )
                : "Belum diperbarui"
            }

          </div>


          <div class="project-actions">


            <button
              type="button"
              class="edit"
              onclick="editProject(${i})">

              Edit

            </button>


            <button
              type="button"
              class="preview"
              onclick="previewProject(${i})">

              Preview

            </button>


            ${
              p.deployId
                ? `

                  <button
                    type="button"
                    class="preview"
                    onclick="copyDeploy(${i})">

                    ⧉

                  </button>

                `
                : ""
            }


          </div>

        </div>

      `;


    } else {


      html += `

        <div class="project-card empty">

          <div class="plus-circle">
            ＋
          </div>


          <b>
            Karya ${i}
          </b>


          <small>
            Slot masih kosong
          </small>


          <button
            type="button"
            class="edit"
            style="
              margin-top:12px;
              border:0;
              background:#eeeaff;
              color:#5b48c3;
              padding:8px 12px;
              border-radius:8px;
              font-weight:700
            "
            onclick="newProject(${i})">

            Buat karya

          </button>


        </div>

      `;

    }

  }


  if ($("projects")) {

    $("projects").innerHTML =
      html;
  }
}


/* =========================================================
   PROJECT EDITOR
========================================================= */

window.newProject =
  slot => {

    openEditor(
      {
        slot,
        title: "",
        html: "",
        deployId: ""
      }
    );

  };


window.editProject =
  slot => {

    const p =
      state.projects.find(
        x =>
          Number(x.slot) ===
          Number(slot)
      );


    openEditor(
      p || {
        slot,
        title: "",
        html: "",
        deployId: ""
      }
    );

  };


/* =========================================================
   PREVIEW KARYA
   VERSI BARU
========================================================= */

window.previewProject =
  slot => {

    const p =
      state.projects.find(
        x =>
          Number(x.slot) ===
          Number(slot)
      );


    if (!p) {

      alert(
        "Karya tidak ditemukan."
      );

      return;
    }


    if (
      !p.html ||
      !p.html.trim()
    ) {

      alert(
        "Karya ini belum memiliki kode HTML."
      );

      return;
    }


    openHtmlPreview(
      p.html,
      p.title ||
      "Preview Karya"
    );

  };


/* =========================================================
   MEMBUKA HTML PREVIEW
========================================================= */

function openHtmlPreview(
  html,
  title
) {

  try {

    /*
     * Blob digunakan agar HTML dibuka
     * sebagai dokumen HTML sungguhan.
     *
     * Ini lebih cocok untuk game yang
     * memiliki CSS dan JavaScript.
     */

    const blob =
      new Blob(
        [html],
        {
          type:
            "text/html;charset=utf-8"
        }
      );


    const url =
      URL.createObjectURL(
        blob
      );


    const previewWindow =
      window.open(
        url,
        "_blank"
      );


    /*
     * Jika popup diblokir browser,
     * gunakan link alternatif.
     */

    if (!previewWindow) {

      const link =
        document.createElement(
          "a"
        );


      link.href =
        url;


      link.target =
        "_blank";


      link.rel =
        "noopener";


      document.body.appendChild(
        link
      );


      link.click();


      link.remove();


      return;
    }


    /*
     * Tidak langsung revoke URL.
     * Browser memerlukan waktu untuk
     * memuat HTML dan resource-nya.
     */

    setTimeout(
      () => {

        try {

          previewWindow.document.title =
            title ||
            "Preview Karya";

        } catch (e) {

          /*
           * Tidak masalah jika
           * browser membatasi akses
           * antar-window.
           */

        }

      },
      500
    );


  } catch (error) {

    console.error(
      "PREVIEW ERROR:",
      error
    );


    alert(
      "Preview gagal dibuka: " +
      error.message
    );

  }

};


/* =========================================================
   OPEN EDITOR
========================================================= */

function openEditor(p) {

  state.current =
    p;


  if ($("editorTitle")) {

    $("editorTitle").textContent =
      `Karya ${p.slot}`;
  }


  if ($("projectTitle")) {

    $("projectTitle").value =
      p.title || "";
  }


  if ($("htmlCode")) {

    $("htmlCode").value =
      p.html || "";
  }


  /*
   * Tetap isi iframe jika tersedia.
   * Ini membuat tombol Preview di editor
   * tetap bisa bekerja jika layout lama
   * memiliki iframe preview.
   */

  if ($("previewFrame")) {

    $("previewFrame").srcdoc =
      p.html || "";
  }


  if ($("deployResult")) {

    $("deployResult").innerHTML =
      "";
  }


  if ($("copyBtn")) {

    $("copyBtn").classList.toggle(
      "hidden",
      !p.deployId
    );
  }


  updateChars();


  if ($("editorModal")) {

    $("editorModal")
      .classList.remove(
        "hidden"
      );
  }

}


/* =========================================================
   CLOSE EDITOR
========================================================= */

if ($("closeEditor")) {

  $("closeEditor").onclick =
    () => {

      if ($("editorModal")) {

        $("editorModal")
          .classList.add(
            "hidden"
          );
      }

    };
}


/* =========================================================
   HTML INPUT
========================================================= */

if ($("htmlCode")) {

  $("htmlCode").oninput =
    updateChars;
}


function updateChars() {

  if (
    !$("charCount") ||
    !$("htmlCode")
  ) {

    return;
  }


  $("charCount").textContent =
    $("htmlCode").value
      .length
      .toLocaleString(
        "id-ID"
      ) +
    " karakter";
}


/* =========================================================
   PREVIEW DARI EDITOR
========================================================= */

if ($("previewBtn")) {

  $("previewBtn").onclick =
    () => {

      const html =
        $("htmlCode")
          ? $("htmlCode").value
          : "";


      if (!html.trim()) {

        alert(
          "Kode HTML masih kosong."
        );

        return;
      }


      openHtmlPreview(
        html,
        $("projectTitle")
          ? $("projectTitle").value
          : "Preview Karya"
      );

    };
}


/* =========================================================
   SAVE PROJECT
========================================================= */

if ($("saveBtn")) {

  $("saveBtn").onclick =
    async () => {

      const button =
        $("saveBtn");


      try {

        button.disabled =
          true;


        button.textContent =
          "Menyimpan...";


        const p =
          state.current;


        if (!p) {

          throw new Error(
            "Proyek belum dipilih."
          );
        }


        const title =
          $("projectTitle")
            .value
            .trim();


        const html =
          $("htmlCode")
            .value;


        if (!html.trim()) {

          throw new Error(
            "HTML masih kosong."
          );
        }


        const r =
          await apiAuth(
            "saveProject",
            {
              slot:
                p.slot,

              title:
                title,

              html:
                html
            }
          );


        if (!r.project) {

          throw new Error(
            "Server tidak mengembalikan data proyek."
          );
        }


        replaceProject(
          r.project
        );


        state.current =
          r.project;


        if ($("deployResult")) {

          $("deployResult").innerHTML =
            `

              <div class="msg success">

                Draft berhasil disimpan.

              </div>

            `;
        }


        if ($("copyBtn")) {

          $("copyBtn")
            .classList.toggle(
              "hidden",
              !r.project.deployId
            );
        }


      } catch (error) {

        console.error(
          "SAVE ERROR:",
          error
        );


        msg(
          $("deployResult"),
          error.message,
          "error"
        );


      } finally {

        button.disabled =
          false;


        button.textContent =
          "Simpan draft";

      }

    };
}


/* =========================================================
   DEPLOY
========================================================= */

if ($("deployBtn")) {

  $("deployBtn").onclick =
    async () => {

      const button =
        $("deployBtn");


      try {

        button.disabled =
          true;


        button.textContent =
          "Deploy...";


        const p =
          state.current;


        if (!p) {

          throw new Error(
            "Proyek belum dipilih."
          );
        }


        const title =
          $("projectTitle")
            .value
            .trim();


        const html =
          $("htmlCode")
            .value;


        if (!html.trim()) {

          throw new Error(
            "HTML masih kosong."
          );
        }


        const r =
          await apiAuth(
            "deploy",
            {
              slot:
                p.slot,

              title:
                title,

              html:
                html
            }
          );


        if (!r.project) {

          throw new Error(
            "Server tidak mengembalikan data proyek."
          );
        }


        replaceProject(
          r.project
        );


        state.current =
          r.project;


        if ($("copyBtn")) {

          $("copyBtn")
            .classList.remove(
              "hidden"
            );
        }


        if ($("deployResult")) {

          $("deployResult").innerHTML =
            `

            <div class="msg success">

              Live:

              <a
                href="${escapeHtml(
                  r.url || ""
                )}"
                target="_blank"
                rel="noopener">

                Buka hasil deploy ↗

              </a>

            </div>

            `;
        }


      } catch (error) {

        console.error(
          "DEPLOY ERROR:",
          error
        );


        msg(
          $("deployResult"),
          error.message,
          "error"
        );


      } finally {

        button.disabled =
          false;


        button.textContent =
          "Deploy karya ↗";

      }

    };
}


/* =========================================================
   PROJECT STATE
========================================================= */

function replaceProject(p) {

  state.projects =
    state.projects.filter(
      x =>
        Number(x.slot) !==
        Number(p.slot)
    );


  state.projects.push(
    p
  );


  renderDashboard();
}


/* =========================================================
   COPY DEPLOY LINK
========================================================= */

window.copyDeploy =
  async slot => {

    const p =
      state.projects.find(
        x =>
          Number(x.slot) ===
          Number(slot)
      );


    if (!p?.deployId) {

      return;
    }


    const url =
      deployUrl(
        p.deployId
      );


    try {

      await navigator.clipboard
        .writeText(
          url
        );


      alert(
        "Link deploy berhasil disalin"
      );


    } catch (error) {

      prompt(
        "Salin link:",
        url
      );

    }

  };


function deployUrl(id) {

  return (
    window.location.origin +
    window.location.pathname +
    "?p=" +
    encodeURIComponent(
      id
    )
  );

}


/* =========================================================
   COPY BUTTON DI EDITOR
========================================================= */

if ($("copyBtn")) {

  $("copyBtn").onclick =
    () => {

      const p =
        state.current;


      if (!p?.deployId) {

        return;
      }


      const url =
        deployUrl(
          p.deployId
        );


      navigator.clipboard
        .writeText(
          url
        )


        .then(
          () => {

            if ($("deployResult")) {

              $("deployResult").innerHTML =
                `

                <div class="msg success">

                  Link disalin.

                </div>

                `;
            }

          }
        )


        .catch(
          () => {

            prompt(
              "Salin link:",
              url
            );

          }
        );

    };

}


/* =========================================================
   ADMIN
========================================================= */

if ($("adminBtn")) {

  $("adminBtn").onclick =
    loadAdmin;
}


if ($("backDash")) {

  $("backDash").onclick =
    () =>
      show(
        "dashboardView"
      );
}


async function loadAdmin() {

  try {

    const r =
      await apiAuth(
        "adminUsers"
      );


    const users =
      Array.isArray(
        r.users
      )
        ? r.users
        : [];


    const pending =
      users.filter(
        x =>
          x.status ===
          "PENDING"
      );


    if ($("pendingCount")) {

      $("pendingCount")
        .textContent =
        pending.length;
    }


    if ($("userCount")) {

      $("userCount")
        .textContent =
        users.length;
    }


    if ($("pendingUsers")) {

      $("pendingUsers")
        .innerHTML =

        pending
          .map(
            x => `

              <div class="user-row">

                <div>

                  <b>

                    ${escapeHtml(
                      x.name
                    )}

                  </b>


                  <small>

                    ${escapeHtml(
                      x.username
                    )}

                    ·

                    ${escapeHtml(
                      x.email
                    )}

                  </small>

                </div>


                <button
                  onclick="approveUser('${escapeHtml(
                    x.id
                  )}')">

                  ✓ ACC

                </button>

              </div>

            `
          )
          .join("")


        ||

        `

          <div
            style="
              padding:22px;
              color:#999;
              font-size:12px
            ">

            Tidak ada pendaftaran
            yang menunggu.

          </div>

        `;

    }


    if ($("allUsers")) {

      $("allUsers").innerHTML =
        `

        <div class="table-wrap">

          <table class="table">

            <tr>

              <th>
                USERNAME
              </th>

              <th>
                NAMA
              </th>

              <th>
                STATUS
              </th>

              <th>
                ROLE
              </th>

            </tr>


            ${
              users
                .map(
                  x => `

                    <tr>

                      <td>

                        ${escapeHtml(
                          x.username
                        )}

                      </td>


                      <td>

                        ${escapeHtml(
                          x.name
                        )}

                      </td>


                      <td>

                        ${escapeHtml(
                          x.status
                        )}

                      </td>


                      <td>

                        ${escapeHtml(
                          x.role
                        )}

                      </td>

                    </tr>

                  `
                )
                .join("")
            }

          </table>

        </div>

        `;
    }


    show(
      "adminView"
    );


  } catch (error) {

    console.error(
      "ADMIN ERROR:",
      error
    );


    msg(
      $("adminMsg"),
      error.message,
      "error"
    );
  }
}


window.approveUser =
  async id => {

    try {

      await apiAuth(
        "approveUser",
        {
          userId:
            id
        }
      );


      await loadAdmin();


    } catch (error) {

      console.error(
        "APPROVE ERROR:",
        error
      );


      msg(
        $("adminMsg"),
        error.message,
        "error"
      );

    }

  };


/* =========================================================
   PUBLIC DEPLOY PAGE
========================================================= */

(async () => {

  const publicId =
    new URLSearchParams(
      location.search
    ).get("p");


  /*
   * Jika URL memiliki ?p=...
   * maka halaman dianggap sebagai
   * halaman karya publik.
   */

  if (publicId) {

    try {

      const r =
        await api(
          "public",
          {
            deployId:
              publicId
          }
        );


      /*
       * JANGAN menggunakan:
       *
       * document.body.innerHTML = r.html
       *
       * karena game dapat mempunyai:
       *
       * <!DOCTYPE html>
       * <html>
       * <head>
       * <style>
       * <script>
       * <body>
       *
       * Kita harus memuat HTML
       * sebagai dokumen lengkap.
       */

      document.open();


      document.write(
        r.html
      );


      document.close();


      return;


    } catch (error) {

      console.error(
        "PUBLIC PAGE ERROR:",
        error
      );


      document.body.innerHTML =
        `

        <div
          style="
            font-family:Arial;
            padding:50px;
            text-align:center
          ">

          <h2>
            Karya tidak ditemukan
          </h2>


          <p>
            Link deploy mungkin
            sudah tidak tersedia.
          </p>

        </div>

        `;


      return;
    }

  }


  /*
   * Jika bukan halaman public,
   * tampilkan dashboard atau login.
   */

  if (token()) {

    await loadDashboard();

  } else {

    show(
      "loginView"
    );

  }

})();
