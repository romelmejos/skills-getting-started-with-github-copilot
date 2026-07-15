document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  let latestActivitiesRequestId = 0;

  function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = type;
    messageDiv.classList.remove("hidden");

    setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  }

  function escapeHtml(value) {
    return value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    const requestId = ++latestActivitiesRequestId;

    try {
      const response = await fetch(`/activities?ts=${Date.now()}`, { cache: "no-store" });
      const activities = await response.json();

      // Ignore out-of-order responses to avoid stale UI state.
      if (requestId !== latestActivitiesRequestId) {
        return;
      }

      // Clear loading message
      activitiesList.innerHTML = "";
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;
        const participantsMarkup = details.participants.length
          ? details.participants
              .map(
                (participant) => `
                  <li class="participant-item">
                    <span class="participant-email">${escapeHtml(participant)}</span>
                    <button
                      type="button"
                      class="remove-participant-btn"
                      data-activity="${encodeURIComponent(name)}"
                      data-email="${encodeURIComponent(participant)}"
                      aria-label="Unregister ${escapeHtml(participant)} from ${escapeHtml(name)}"
                      title="Unregister participant"
                    >
                      🗑
                    </button>
                  </li>
                `
              )
              .join("")
          : '<li class="participant-item-empty">No participants yet</li>';

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-section">
            <p class="participants-title"><strong>Participants (${details.participants.length})</strong></p>
            <ul class="participants-list">
              ${participantsMarkup}
            </ul>
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      if (requestId !== latestActivitiesRequestId) {
        return;
      }

      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        signupForm.reset();
        await fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  });

  activitiesList.addEventListener("click", async (event) => {
    const removeButton = event.target.closest(".remove-participant-btn");
    if (!removeButton) {
      return;
    }

    const activity = removeButton.dataset.activity;
    const email = removeButton.dataset.email;

    if (!activity || !email) {
      showMessage("Could not identify participant to remove.", "error");
      return;
    }

    removeButton.disabled = true;

    try {
      const response = await fetch(
        `/activities/${activity}/participants/${email}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        await fetchActivities();
      } else {
        showMessage(result.detail || "Could not unregister participant.", "error");
      }
    } catch (error) {
      showMessage("Failed to unregister participant. Please try again.", "error");
      console.error("Error unregistering participant:", error);
    } finally {
      removeButton.disabled = false;
    }
  });

  // Initialize app
  fetchActivities();
});
