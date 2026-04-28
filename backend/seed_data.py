import os
from pathlib import Path
from datetime import datetime, timedelta, timezone

# Load env variables BEFORE importing firebase_config
_env_path = Path(__file__).parent.parent / ".env"
from dotenv import load_dotenv
load_dotenv(dotenv_path=_env_path, override=False)

import firebase_config
from google.cloud import firestore

db = firebase_config.db
NOW = datetime.now(timezone.utc)

def seed_doc(collection_name: str, doc_id: str, data: dict):
    doc_ref = db.collection(collection_name).document(doc_id)
    if doc_ref.get().exists:
        print(f"Skipping {collection_name}/{doc_id} — already exists")
    else:
        doc_ref.set(data)
        print(f"Created {collection_name}/{doc_id}")

def main():
    print("Starting SevaSync seed data script...")

    # --- ADMIN USERS ---
    admins = [
        {"uid": "admin_001", "name": "Priya Sharma", "email": "priya@sevasync.org", "role": "admin", "organization": "SevaSync HQ"},
        {"uid": "admin_002", "name": "Rahul Menon", "email": "rahul@sevasync.org", "role": "admin", "organization": "SevaSync HQ"}
    ]
    for admin in admins:
        seed_doc("users", admin["uid"], admin)

    # --- VOLUNTEERS ---
    vols_data = [
        {"uid": "vol_001", "name": "Anjali Desai", "skills": ["medical","field_support"], "area": "Andheri", "city": "Mumbai", "languages": ["english","hindi","marathi"], "availability": {"weekdays": True, "weekends": True, "hoursPerWeek": 10}, "maxActiveTasks": 3, "status": "available", "activeTaskCount": 1, "totalCompleted": 8, "rating": 4.7},
        {"uid": "vol_002", "name": "Karan Patel", "skills": ["logistics","transportation"], "area": "Bandra", "city": "Mumbai", "languages": ["english","hindi","gujarati"], "availability": {"weekdays": True, "weekends": False, "hoursPerWeek": 8}, "maxActiveTasks": 2, "status": "available", "activeTaskCount": 0, "totalCompleted": 12, "rating": 4.9},
        {"uid": "vol_003", "name": "Sneha Iyer", "skills": ["counselling","community_outreach"], "area": "Dadar", "city": "Mumbai", "languages": ["english","hindi","tamil"], "availability": {"weekdays": False, "weekends": True, "hoursPerWeek": 6}, "maxActiveTasks": 2, "status": "available", "activeTaskCount": 0, "totalCompleted": 5, "rating": 4.5},
        {"uid": "vol_004", "name": "Rohan Verma", "skills": ["data_entry","documentation"], "area": "Powai", "city": "Mumbai", "languages": ["english","hindi"], "availability": {"weekdays": True, "weekends": True, "hoursPerWeek": 15}, "maxActiveTasks": 4, "status": "busy", "activeTaskCount": 3, "totalCompleted": 20, "rating": 4.8},
        {"uid": "vol_005", "name": "Fatima Sheikh", "skills": ["medical","counselling"], "area": "Kurla", "city": "Mumbai", "languages": ["english","hindi","urdu"], "availability": {"weekdays": True, "weekends": False, "hoursPerWeek": 12}, "maxActiveTasks": 3, "status": "available", "activeTaskCount": 1, "totalCompleted": 15, "rating": 4.6},
        {"uid": "vol_006", "name": "Amit Joshi", "skills": ["field_support","community_outreach","logistics"], "area": "Thane", "city": "Mumbai", "languages": ["english","hindi","marathi"], "availability": {"weekdays": False, "weekends": True, "hoursPerWeek": 8}, "maxActiveTasks": 3, "status": "available", "activeTaskCount": 0, "totalCompleted": 9, "rating": 4.4},
        {"uid": "vol_007", "name": "Deepika Nair", "skills": ["translation","documentation"], "area": "Chembur", "city": "Mumbai", "languages": ["english","hindi","malayalam","tamil"], "availability": {"weekdays": True, "weekends": True, "hoursPerWeek": 10}, "maxActiveTasks": 3, "status": "available", "activeTaskCount": 2, "totalCompleted": 6, "rating": 4.3},
        {"uid": "vol_008", "name": "Vikram Singh", "skills": ["logistics","field_support"], "area": "Borivali", "city": "Mumbai", "languages": ["english","hindi","punjabi"], "availability": {"weekdays": True, "weekends": False, "hoursPerWeek": 20}, "maxActiveTasks": 5, "status": "busy", "activeTaskCount": 4, "totalCompleted": 25, "rating": 4.9},
        {"uid": "vol_009", "name": "Meena Kulkarni", "skills": ["medical","documentation","data_entry"], "area": "Vile Parle", "city": "Mumbai", "languages": ["english","hindi","marathi"], "availability": {"weekdays": True, "weekends": True, "hoursPerWeek": 14}, "maxActiveTasks": 3, "status": "available", "activeTaskCount": 0, "totalCompleted": 11, "rating": 4.7},
        {"uid": "vol_010", "name": "Suresh Pillai", "skills": ["community_outreach","counselling","translation"], "area": "Navi Mumbai", "city": "Mumbai", "languages": ["english","hindi","malayalam"], "availability": {"weekdays": False, "weekends": True, "hoursPerWeek": 6}, "maxActiveTasks": 2, "status": "offline", "activeTaskCount": 0, "totalCompleted": 3, "rating": 4.1}
    ]
    for v in vols_data:
        uid = v["uid"]
        # write to users
        seed_doc("users", uid, {
            "uid": uid,
            "name": v["name"],
            "email": f"{uid}@sevasync.org",
            "role": "volunteer"
        })
        # write to volunteer profiles (router uses "volunteers")
        profile = dict(v)
        profile["userId"] = uid
        # ensure location object exists to match standard schema
        profile["location"] = {"area": v["area"], "city": v["city"]}
        seed_doc("volunteers", uid, profile)

    # --- NEEDS ---
    needs_data = [
        {
            "id": "need_001", "title": "Urgent insulin delivery needed", "category": "medical", "urgency": "critical", "status": "assigned", 
            "beneficiaryCount": 1, "vulnerableGroup": True, "location": {"area": "Kurla", "city": "Mumbai"}, 
            "rawDescription": "Elderly diabetic man in Kurla East has not received insulin for 2 days. Cannot travel. Family needs urgent medical volunteer.", 
            "aiSummary": "Elderly diabetic patient needs urgent insulin delivery in Kurla East", "requiredSkills": ["medical","field_support"], "estimatedHours": 2, "confidenceScore": 0.97,
            "priorityScore": 98, "submittedBy": "admin_001", "createdAt": NOW
        },
        {
            "id": "need_002", "title": "Food packets for flood relief camp", "category": "food_essentials", "urgency": "critical", "status": "in_progress", 
            "beneficiaryCount": 150, "vulnerableGroup": False, "location": {"area": "Thane", "city": "Mumbai"}, 
            "rawDescription": "Flood relief camp at Thane needs 150 food packets distributed by evening. Volunteers with vehicles preferred.", 
            "aiSummary": "150 food packets needed at flood relief camp in Thane by evening", "requiredSkills": ["logistics","field_support"], "estimatedHours": 4, "confidenceScore": 0.95,
            "priorityScore": 96, "submittedBy": "admin_001", "createdAt": NOW
        },
        {
            "id": "need_003", "title": "Mental health support for displaced families", "category": "medical", "urgency": "high", "status": "pending_assignment", 
            "beneficiaryCount": 30, "vulnerableGroup": True, "location": {"area": "Bandra", "city": "Mumbai"}, 
            "rawDescription": "30 families displaced due to building collapse in Bandra need immediate mental health support and grief counselling.", 
            "aiSummary": "Grief counselling needed for 30 displaced families in Bandra", "requiredSkills": ["counselling","community_outreach"], "estimatedHours": 6, "confidenceScore": 0.93,
            "priorityScore": 82, "submittedBy": "admin_002", "createdAt": NOW
        },
        {
            "id": "need_004", "title": "Document recovery assistance for fire victims", "category": "documentation", "urgency": "high", "status": "assigned", 
            "beneficiaryCount": 12, "vulnerableGroup": False, "location": {"area": "Dharavi", "city": "Mumbai"}, 
            "rawDescription": "12 families lost all documents in a fire. Need volunteers to help them apply for Aadhaar, ration card, and birth certificates at government offices.", 
            "aiSummary": "Document recovery support for 12 fire-affected families in Dharavi", "requiredSkills": ["documentation","data_entry"], "estimatedHours": 8, "confidenceScore": 0.91,
            "priorityScore": 78, "submittedBy": "admin_001", "createdAt": NOW
        },
        {
            "id": "need_005", "title": "Mobile medical camp support", "category": "medical", "urgency": "high", "status": "pending_assignment", 
            "beneficiaryCount": 80, "vulnerableGroup": False, "location": {"area": "Andheri", "city": "Mumbai"}, 
            "rawDescription": "Upcoming mobile medical camp in Andheri slum area. Need 3 medical volunteers to assist doctors with patient registration, vitals, and medication distribution.", 
            "aiSummary": "Medical volunteers needed at Andheri mobile health camp for 80 patients", "requiredSkills": ["medical","data_entry"], "estimatedHours": 5, "confidenceScore": 0.96,
            "priorityScore": 75, "submittedBy": "admin_002", "createdAt": NOW
        },
        {
            "id": "need_006", "title": "Elderly care home weekly visit", "category": "elderly_support", "urgency": "medium", "status": "pending_assignment", 
            "beneficiaryCount": 25, "vulnerableGroup": True, "location": {"area": "Borivali", "city": "Mumbai"}, 
            "rawDescription": "Old age home in Borivali needs weekly volunteers for companionship, reading, and light assistance for 25 elderly residents.", 
            "aiSummary": "Weekly companion volunteers needed at Borivali elderly care home", "requiredSkills": ["community_outreach","counselling"], "estimatedHours": 3, "confidenceScore": 0.89,
            "priorityScore": 58, "submittedBy": "admin_001", "createdAt": NOW
        },
        {
            "id": "need_007", "title": "Tutoring for underprivileged children", "category": "child_support", "urgency": "medium", "status": "pending_assignment", 
            "beneficiaryCount": 20, "vulnerableGroup": True, "location": {"area": "Powai", "city": "Mumbai"}, 
            "rawDescription": "NGO needs tutors for 20 children aged 8-14 in Powai resettlement colony. Subjects: English, Math, Science. Weekends only.", 
            "aiSummary": "Weekend tutors needed for 20 underprivileged children in Powai", "requiredSkills": ["community_outreach","documentation"], "estimatedHours": 4, "confidenceScore": 0.88,
            "priorityScore": 55, "submittedBy": "admin_002", "createdAt": NOW
        },
        {
            "id": "need_008", "title": "Translation support for migrant workers", "category": "documentation", "urgency": "medium", "status": "completed", 
            "beneficiaryCount": 18, "vulnerableGroup": False, "location": {"area": "Vile Parle", "city": "Mumbai"}, 
            "rawDescription": "18 migrant workers from Tamil Nadu need translation help for work permit documents. Volunteers who speak Tamil and Hindi needed.", 
            "aiSummary": "Tamil-Hindi translation support for 18 migrant workers in Vile Parle", "requiredSkills": ["translation","documentation"], "estimatedHours": 3, "confidenceScore": 0.94,
            "priorityScore": 48, "submittedBy": "admin_001", "createdAt": NOW - timedelta(days=5)
        },
        {
            "id": "need_009", "title": "Supply run for community kitchen", "category": "food_essentials", "urgency": "medium", "status": "completed", 
            "beneficiaryCount": 60, "vulnerableGroup": False, "location": {"area": "Dadar", "city": "Mumbai"}, 
            "rawDescription": "Community kitchen in Dadar needs a volunteer with a vehicle to pick up vegetable and grain supplies from APMC market early morning.", 
            "aiSummary": "Supply pickup volunteer needed for Dadar community kitchen serving 60 people", "requiredSkills": ["logistics"], "estimatedHours": 3, "confidenceScore": 0.92,
            "priorityScore": 45, "submittedBy": "admin_002", "createdAt": NOW - timedelta(days=3)
        },
        {
            "id": "need_010", "title": "Data entry for health survey", "category": "documentation", "urgency": "low", "status": "completed", 
            "beneficiaryCount": 500, "vulnerableGroup": False, "location": {"area": "Chembur", "city": "Mumbai"}, 
            "rawDescription": "Health survey data from 500 households in Chembur needs to be digitized and entered into spreadsheets. Remote work possible.", 
            "aiSummary": "Remote data entry for 500-household Chembur health survey", "requiredSkills": ["data_entry","documentation"], "estimatedHours": 12, "confidenceScore": 0.98,
            "priorityScore": 35, "submittedBy": "admin_001", "createdAt": NOW - timedelta(days=7)
        },
        {
            "id": "need_011", "title": "Awareness drive for sanitation program", "category": "shelter_community", "urgency": "low", "status": "pending_assignment", 
            "beneficiaryCount": 200, "vulnerableGroup": False, "location": {"area": "Navi Mumbai", "city": "Mumbai"}, 
            "rawDescription": "Local NGO needs 4 volunteers for a sanitation awareness door-to-door campaign in Navi Mumbai. Marathi or Hindi speaking preferred.", 
            "aiSummary": "Door-to-door sanitation awareness campaign in Navi Mumbai for 200 households", "requiredSkills": ["community_outreach","translation"], "estimatedHours": 6, "confidenceScore": 0.87,
            "priorityScore": 30, "submittedBy": "admin_002", "createdAt": NOW
        },
        {
            "id": "need_012", "title": "Transport for wheelchair-bound patient", "category": "transport_logistics", "urgency": "high", "status": "pending_assignment", 
            "beneficiaryCount": 1, "vulnerableGroup": True, "location": {"area": "Bandra", "city": "Mumbai"}, 
            "rawDescription": "Wheelchair-bound woman in Bandra needs transport to Lilavati Hospital for chemotherapy on Tuesday morning. Private vehicle needed.", 
            "aiSummary": "Wheelchair patient needs private vehicle transport to Lilavati Hospital Bandra", "requiredSkills": ["logistics","field_support"], "estimatedHours": 3, "confidenceScore": 0.96,
            "priorityScore": 80, "submittedBy": "admin_001", "createdAt": NOW
        }
    ]
    for n in needs_data:
        n_id = n["id"]
        # Add submittedAt to match backend model
        n["submittedAt"] = n["createdAt"]
        seed_doc("needs", n_id, n)

    # --- ASSIGNMENTS ---
    assignments_data = [
        {"id": "assign_001", "needId": "need_001", "volunteerId": "vol_005", "assignedBy": "admin_001", "status": "accepted", "assignedAt": NOW - timedelta(hours=2), "acceptedAt": NOW - timedelta(hours=1.5)},
        {"id": "assign_002", "needId": "need_002", "volunteerId": "vol_006", "assignedBy": "admin_001", "status": "started", "assignedAt": NOW - timedelta(hours=3), "acceptedAt": NOW - timedelta(hours=2.5)},
        {"id": "assign_003", "needId": "need_008", "volunteerId": "vol_007", "assignedBy": "admin_002", "status": "completed", "assignedAt": NOW - timedelta(days=5), "completedAt": NOW - timedelta(days=4)},
        {"id": "assign_004", "needId": "need_009", "volunteerId": "vol_002", "assignedBy": "admin_002", "status": "completed", "assignedAt": NOW - timedelta(days=3), "completedAt": NOW - timedelta(days=2)}
    ]
    for a in assignments_data:
        seed_doc("assignments", a["id"], a)

    # --- ACTIVITY LOGS ---
    logs_data = [
        {"id": "log_001", "entityType": "need", "entityId": "need_001", "action": "volunteer_assigned", "actor": "admin_001", "timestamp": NOW - timedelta(hours=2)},
        {"id": "log_002", "entityType": "assignment", "entityId": "assign_001", "action": "status_changed", "actor": "vol_005", "timestamp": NOW - timedelta(hours=1.5)},
        {"id": "log_003", "entityType": "need", "entityId": "need_002", "action": "volunteer_assigned", "actor": "admin_001", "timestamp": NOW - timedelta(hours=3)},
        {"id": "log_004", "entityType": "assignment", "entityId": "assign_002", "action": "status_changed", "actor": "vol_006", "timestamp": NOW - timedelta(hours=2.5)},
        {"id": "log_005", "entityType": "need", "entityId": "need_008", "action": "status_changed", "actor": "vol_007", "timestamp": NOW - timedelta(days=4)},
        {"id": "log_006", "entityType": "need", "entityId": "need_009", "action": "status_changed", "actor": "vol_002", "timestamp": NOW - timedelta(days=2)}
    ]
    for log in logs_data:
        seed_doc("activity_logs", log["id"], log)

    print("\n✅ Seeded: 2 admins, 10 volunteers, 12 needs, 4 assignments, 6 activity logs")

if __name__ == "__main__":
    main()
