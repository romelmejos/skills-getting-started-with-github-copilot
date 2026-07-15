from urllib.parse import quote


def test_get_root_redirects_to_static_index(client):
    # Arrange
    endpoint = "/"

    # Act
    response = client.get(endpoint, follow_redirects=False)

    # Assert
    assert response.status_code in (307, 308)
    assert response.headers["location"] == "/static/index.html"


def test_get_activities_returns_expected_structure(client):
    # Arrange
    endpoint = "/activities"

    # Act
    response = client.get(endpoint)
    data = response.json()

    # Assert
    assert response.status_code == 200
    assert isinstance(data, dict)
    assert "Chess Club" in data
    assert {"description", "schedule", "max_participants", "participants"}.issubset(
        data["Chess Club"].keys()
    )


def test_signup_succeeds_for_new_participant(client):
    # Arrange
    activity_name = "Chess Club"
    email = "newstudent@mergington.edu"
    endpoint = f"/activities/{quote(activity_name)}/signup"

    # Act
    response = client.post(endpoint, params={"email": email})
    data = response.json()

    # Assert
    assert response.status_code == 200
    assert data["message"] == f"Signed up {email} for {activity_name}"



def test_signup_rejects_duplicate_participant(client):
    # Arrange
    activity_name = "Chess Club"
    existing_email = "michael@mergington.edu"
    endpoint = f"/activities/{quote(activity_name)}/signup"

    # Act
    response = client.post(endpoint, params={"email": existing_email})
    data = response.json()

    # Assert
    assert response.status_code == 400
    assert data["detail"] == "Student is already signed up for this activity"



def test_signup_fails_for_unknown_activity(client):
    # Arrange
    unknown_activity = "Unknown Club"
    email = "student@mergington.edu"
    endpoint = f"/activities/{quote(unknown_activity)}/signup"

    # Act
    response = client.post(endpoint, params={"email": email})
    data = response.json()

    # Assert
    assert response.status_code == 404
    assert data["detail"] == "Activity not found"



def test_signup_requires_email_query_param(client):
    # Arrange
    activity_name = "Chess Club"
    endpoint = f"/activities/{quote(activity_name)}/signup"

    # Act
    response = client.post(endpoint)

    # Assert
    assert response.status_code == 422



def test_unregister_succeeds_for_existing_participant(client):
    # Arrange
    activity_name = "Chess Club"
    email = "michael@mergington.edu"
    endpoint = f"/activities/{quote(activity_name)}/participants/{quote(email)}"

    # Act
    response = client.delete(endpoint)
    data = response.json()

    # Assert
    assert response.status_code == 200
    assert data["message"] == f"Unregistered {email} from {activity_name}"



def test_unregister_fails_for_unknown_activity(client):
    # Arrange
    unknown_activity = "Unknown Club"
    email = "student@mergington.edu"
    endpoint = f"/activities/{quote(unknown_activity)}/participants/{quote(email)}"

    # Act
    response = client.delete(endpoint)
    data = response.json()

    # Assert
    assert response.status_code == 404
    assert data["detail"] == "Activity not found"



def test_unregister_fails_when_participant_not_signed_up(client):
    # Arrange
    activity_name = "Chess Club"
    absent_email = "absent@mergington.edu"
    endpoint = f"/activities/{quote(activity_name)}/participants/{quote(absent_email)}"

    # Act
    response = client.delete(endpoint)
    data = response.json()

    # Assert
    assert response.status_code == 404
    assert data["detail"] == "Student is not signed up for this activity"
