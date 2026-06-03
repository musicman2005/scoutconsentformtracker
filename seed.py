#!/usr/bin/env python3
"""Seed the ScoutGroupDocMgr database with test data via the API."""

import httpx
import random
from datetime import date, timedelta

BASE = "http://192.168.10.181:8003/api"

# ── Test data ──────────────────────────────────────────────────────────────────

GROUPS = [
    {"name": "1st Riverside Joey Scouts",    "section": "Joey Scouts"},
    {"name": "1st Riverside Cub Scouts",     "section": "Cub Scouts"},
    {"name": "1st Riverside Scouts",         "section": "Scouts"},
    {"name": "1st Riverside Venturers",      "section": "Venturers"},
]

FIRST_NAMES_KID = [
    "Liam","Noah","Oliver","James","Lucas","Henry","Ethan","Mason","Logan","Jackson",
    "Aiden","Sebastian","Carter","Wyatt","Dylan","Grayson","Levi","Isaac","Owen","Nathan",
    "Emma","Olivia","Ava","Sophia","Isabella","Mia","Charlotte","Amelia","Harper","Evelyn",
    "Abigail","Emily","Ella","Elizabeth","Camila","Luna","Sofia","Avery","Mila","Aria",
    "Archer","Flynn","Hamish","Angus","Declan","Finn","Hugo","Jasper","Remy","Zac",
]

FIRST_NAMES_ADULT = [
    "Michael","David","James","Robert","John","William","Richard","Thomas","Mark","Paul",
    "Sarah","Jennifer","Amanda","Jessica","Melissa","Michelle","Laura","Lisa","Amy","Karen",
    "Matthew","Andrew","Daniel","Christopher","Jason","Ryan","Kevin","Brian","George","Edward",
    "Rebecca","Catherine","Stephanie","Nicole","Angela","Helen","Deborah","Sharon","Patricia","Linda",
]

LAST_NAMES = [
    "Smith","Jones","Williams","Brown","Taylor","Wilson","Johnson","White","Martin","Anderson",
    "Thompson","Garcia","Martinez","Robinson","Clark","Rodriguez","Lewis","Lee","Walker","Hall",
    "Allen","Young","Hernandez","King","Wright","Scott","Torres","Nguyen","Hill","Flores",
    "Green","Adams","Nelson","Baker","Mitchell","Carter","Perez","Roberts","Turner","Phillips",
    "Campbell","Parker","Evans","Edwards","Collins","Stewart","Sanchez","Morris","Rogers","Reed",
]

RELATIONSHIPS = ["Mother","Father","Mother","Father","Guardian","Grandmother","Grandfather"]

FORMS = [
    {
        "name": "Annual Camp Consent",
        "description": "Consent for scouts to attend the annual group camp, including overnight stay and outdoor activities.",
    },
    {
        "name": "Rock Climbing Activity Consent",
        "description": "Consent for participation in supervised rock climbing and abseiling activities.",
    },
    {
        "name": "Swimming / Water Activities Consent",
        "description": "Consent for all water-based activities including swimming, canoeing, and kayaking.",
    },
    {
        "name": "Photography & Media Release",
        "description": "Permission to use photos and video of the scout in group publications and social media.",
    },
    {
        "name": "Medical Information & Emergency Contact",
        "description": "Annual medical information update and emergency contact details.",
    },
]

STATUSES = ["pending", "pending", "sent", "sent", "sent", "signed", "signed", "signed", "signed", "declined"]

def random_dob(min_age: int, max_age: int) -> str:
    days = random.randint(min_age * 365, max_age * 365)
    dob = date.today() - timedelta(days=days)
    return dob.isoformat()

def unique_name(used: set, first_pool, last_pool) -> tuple[str, str]:
    for _ in range(200):
        fn = random.choice(first_pool)
        ln = random.choice(last_pool)
        if (fn, ln) not in used:
            used.add((fn, ln))
            return fn, ln
    return random.choice(first_pool), random.choice(last_pool)

# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    used_scout_names: set = set()
    used_guardian_names: set = set()

    with httpx.Client(base_url=BASE, timeout=30) as c:

        # Forms
        print("Creating form templates...")
        form_ids = []
        for f in FORMS:
            r = c.post("/forms", json=f)
            r.raise_for_status()
            form_ids.append(r.json()["id"])
        print(f"  {len(form_ids)} forms created")

        # Groups + scouts + guardians
        all_scout_ids = []
        all_guardian_ids = []

        for group_data in GROUPS:
            section = group_data["section"]
            r = c.post("/groups", json=group_data)
            r.raise_for_status()
            group_id = r.json()["id"]
            print(f"\nGroup: {group_data['name']}")

            # Age ranges by section
            age_range = {
                "Joey Scouts": (5, 8),
                "Cub Scouts": (8, 11),
                "Scouts": (11, 15),
                "Venturers": (15, 18),
            }.get(section, (10, 15))

            scout_ids_in_group = []
            for _ in range(30):
                fn, ln = unique_name(used_scout_names, FIRST_NAMES_KID, LAST_NAMES)
                dob = random_dob(*age_range)
                r = c.post("/scouts", json={
                    "first_name": fn,
                    "last_name": ln,
                    "date_of_birth": dob,
                    "group_id": group_id,
                    "active": True,
                })
                r.raise_for_status()
                scout_id = r.json()["id"]
                scout_ids_in_group.append(scout_id)
                all_scout_ids.append(scout_id)

                # 1 or 2 guardians per scout, same last name
                num_guardians = random.choices([1, 2], weights=[3, 7])[0]
                for i in range(num_guardians):
                    gfn, _ = unique_name(used_guardian_names, FIRST_NAMES_ADULT, [ln])
                    rel = random.choice(RELATIONSHIPS)
                    email = f"{gfn.lower()}.{ln.lower()}{random.randint(10,99)}@example.com"
                    phone = f"04{random.randint(10,99)} {random.randint(100,999)} {random.randint(100,999)}"
                    r2 = c.post("/guardians", json={
                        "first_name": gfn,
                        "last_name": ln,
                        "email": email,
                        "phone": phone,
                        "relationship_to_scout": rel,
                        "scout_id": scout_id,
                        "is_primary": i == 0,
                    })
                    r2.raise_for_status()
                    all_guardian_ids.append((r2.json()["id"], scout_id))

            print(f"  30 scouts + guardians created")

            # Create signing requests for each scout × first 2 forms
            print(f"  Creating signing requests...")
            req_count = 0
            for scout_id in scout_ids_in_group:
                # Get guardians for this scout
                guardians = [gid for gid, sid in all_guardian_ids if sid == scout_id]
                if not guardians:
                    continue
                primary_guardian = guardians[0]

                for form_id in form_ids[:2]:  # first 2 forms per scout
                    status = random.choice(STATUSES)
                    r3 = c.post("/signing-requests", json={
                        "scout_id": scout_id,
                        "guardian_id": primary_guardian,
                        "form_template_id": form_id,
                    })
                    r3.raise_for_status()
                    req_id = r3.json()["id"]
                    req_count += 1

                    # Update status to match realistic state
                    if status != "pending":
                        c.put(f"/signing-requests/{req_id}", json={"status": status})

            print(f"  {req_count} signing requests created")

        print(f"\n✓ Seed complete!")
        print(f"  Groups:           {len(GROUPS)}")
        print(f"  Scouts:           {len(all_scout_ids)}")
        print(f"  Guardians:        {len(all_guardian_ids)}")
        print(f"  Forms:            {len(form_ids)}")
        print(f"  Signing requests: {len(all_scout_ids) * 2} (approx)")


if __name__ == "__main__":
    main()
