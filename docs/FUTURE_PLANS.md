# SeatAI - Future Development Plans

> Document created: 2026-02-25
> Status: Planning Phase

---

## Table of Contents

1. [Current State](#current-state)
2. [First Day of School Scenario](#first-day-of-school-scenario)
3. [Student Constraints - Complete List](#student-constraints---complete-list)
4. [Drag & Drop Improvements](#drag--drop-improvements)
5. [Score Recalculation](#score-recalculation)
6. [New Features](#new-features)
7. [Data Collection Methods](#data-collection-methods)
8. [Algorithm Improvements](#algorithm-improvements)
9. [UI/UX Enhancements](#uiux-enhancements)
10. [Implementation Roadmap](#implementation-roadmap)

---

## Current State

### What's Working:
- Genetic algorithm optimization
- 30 sample students with realistic data
- 2 students per desk layout
- Drag & drop seat swapping
- Hover info popup for student details
- Basic constraints (friends, incompatible, front row needs)

### Current Limitations:
- No real-time score updates after manual changes
- No constraint violation warnings during drag
- No undo/redo functionality
- No first-day-of-school mode (when students don't know each other)
- No rotation system
- No longitudinal tracking

---

## First Day of School Scenario

### The Problem
On day 1, students don't know each other, so "friends" and "incompatible" constraints don't apply. Need different optimization strategies.

### Available Pre-School Data

**From Teacher Questionnaire:**
- Academic history (previous grades, strengths/weaknesses)
- Learning style preferences (visual/auditory/hands-on)
- Language spoken at home / ESL level
- Medical/special needs (IEP, 504, allergies)
- Vision/hearing issues
- Behavioral history (from previous school)
- Attention/focus challenges
- Interests/hobbies (for potential common ground)
- Personality type (shy/outgoing)

**From School Records:**
- Standardized test scores
- Attendance history
- Discipline records
- Teacher recommendations

### First Day Seating Strategies

#### Strategy A: Balanced Distribution
- Every desk has mix of strong/struggling students
- Every row has similar academic average
- Gender balance per desk (boy+girl pairs)
- Special needs in appropriate locations

#### Strategy B: Support Clustering
- High achievers paired with struggling students
- ESL students near bilingual students
- ADHD students near calm, focused peers
- New students near "welcoming" personalities

#### Strategy C: Zone-Based Placement
```
     ┌─────TEACHER/BOARD─────┐
     │                       │
     │  [Front Row]          │  ← Vision/hearing needs,
     │  ADHD, focus needs    │    teacher attention needed
     │                       │
     │  [Middle Zone]        │  ← Standard students,
     │  Average learners     │    good focus area
     │                       │
     │  [Back Zone]          │  ← Strong independent
     │  Self-directed,       │    learners
     │  advanced students    │
     │                       │
 [Window]              [Door]
  ↑                           ↑
  Easily distracted here      High traffic area
```

#### Strategy D: Rotation Ready
- Assign temporary seats for first week
- Plan weekly rotations
- Everyone gets experience in different zones
- Collect data during rotations

### First Day Questionnaire Template

```
ACADEMIC:
□ What subjects do you enjoy most?
□ What subjects are challenging for you?
□ Do you prefer working alone or with others?
□ How do you learn best? (reading, listening, doing)

FOCUS & ATTENTION:
□ Do you get distracted easily?
□ Do you need to see the board clearly?
□ Do you have trouble hearing in class?
□ Do you need frequent breaks?

ENVIRONMENT:
□ Do you prefer sitting in front/middle/back?
□ Are you bothered by noise?
□ Do you get distracted by windows/doors?
□ Do you need extra space for materials?

PERSONALITY:
□ Are you shy or outgoing?
□ Do you make friends easily?
□ Are you a good helper?
□ What are your hobbies/interests?

SPECIAL NEEDS (for parent/teacher):
□ Medical conditions we should know about?
□ Allergies?
□ Medications that affect focus?
□ IEP/504 accommodations?
□ Languages spoken at home?
```

---

## Student Constraints - Complete List

### Current Constraints
| Constraint | Field | Description |
|------------|-------|-------------|
| Friends | `friends_ids` | Students who want to sit near each other |
| Incompatible | `incompatible_ids` | Students who must be separated |
| Front Row Need | `requires_front_row` | Must sit in front rows |
| Quiet Area | `requires_quiet_area` | Needs low-distraction zone |
| Mobility | `has_mobility_issues` | Needs accessible seating |

### Proposed Additional Constraints

| Constraint Type | Field | Description |
|-----------------|-------|-------------|
| **Academic Help Buddy** | `helper_id` | Struggling student needs strong student nearby |
| **Language Buddy** | `language_buddy_id` | ESL student needs native speaker nearby |
| **Behavior Partner** | `positive_influence_id` | Challenging student paired with good influence |
| **Learning Style** | `learning_style` | Visual/Auditory/Kinetic - for grouping |
| **Attention Span** | `avoid_distractions` | Low attention → away from windows/door |
| **Personality Type** | `personality_type` | Introvert/Extrovert - for balance |
| **Group Project Team** | `group_id` | Pre-assigned groups that stay together |
| **Medical Priority** | `medical_priority` | Students who need medication access |
| **Vision Needs** | `vision_needs` | Need larger text or closer to board |
| **Hearing Needs** | `hearing_needs` | Need to see teacher's face (lip reading) |

### Constraint Types Matrix

| Constraint Type | Example |
|-----------------|---------|
| MUST BE NEAR | ESL near bilingual buddy |
| MUST NOT BE NEAR | Past conflict students |
| MUST BE IN ROW | Front row for ADHD |
| MUST NOT BE IN ROW | Back row for distraction-prone |
| MUST BE NEAR WINDOW/DOOR | Student who needs fresh air |
| MUST NOT BE NEAR WINDOW | Easily distracted |
| MUST BE NEAR AISLE | Wheelchair accessibility |
| MUST BE IN CENTER | Needs maximum board visibility |
| AVOID BEING ALONE | Needs peer support nearby |
| PREFER SAME GENDER | Cultural/religious reasons |
| PREFER MIXED GENDER | Classroom balance |
| SAME LEARNING STYLE | Visual learners together |
| MIXED LEARNING STYLE | Balance at each desk |
| SAME ACADEMIC LEVEL | Group work by ability |
| MIXED ACADEMIC LEVEL | Peer tutoring setup |
| SIMILAR PERSONALITY | Two quiet students together |
| COMPLEMENTARY PERSONALITY | Introvert + Extrovert pair |
| NEEDS STRONG NEIGHBOR | Struggling student needs help |
| AVOID STRONG NEIGHBOR | Prevent copying on tests |
| SAME INTEREST GROUP | Project team clustering |
| LANGUAGE CLUSTER | ESL same language support |
| AWAY FROM TEACHER PATH | Independent workers |
| IN TEACHER PATH | Needs frequent check-ins |

---

## Drag & Drop Improvements

### Current Issues
- Only visual swap, doesn't recalculate scores
- No undo functionality
- No validation (can place incompatible students together)

### Proposed Improvements

#### A. Real-time Score Recalculation
- After each swap, recalculate fitness scores
- Show score change: "Score: 78% → 82% (+4%)"
- Color code improvement (green) vs decline (red)

#### B. Visual Feedback During Drag
- Show compatibility indicators on drop targets:
  - 🟢 Green = Good placement (friends together)
  - 🟡 Yellow = Neutral
  - 🔴 Red = Bad placement (conflicts, needs front row)

#### C. Constraint Validation
- Warning popup: "Frank has ADHD and needs front row. Are you sure you want to move them to row 4?"
- Option to block invalid moves

#### D. Undo/Redo Stack
- Keep history of manual changes
- Undo button (Ctrl+Z)
- Redo button (Ctrl+Y)

#### E. Drag Preview
- Show ghost of dragged student
- Highlight valid drop zones

---

## Score Recalculation

### What Should Update After Manual Seat Swap

```
AFTER MANUAL SEAT SWAP:
├── Total Fitness Score (immediately)
├── Breakdown by Category:
│   ├── Academic Balance Score
│   ├── Behavioral Balance Score
│   ├── Diversity Score
│   └── Special Needs Compliance Score
│
├── Warnings/Alerts:
│   ├── "⚠️ Frank (ADHD) is now in row 4 (not front row)"
│   ├── "❌ Jack & Kate are sitting together (disruptive pair)"
│   └── "🔴 Ivan has no language buddy nearby"
│
└── Suggestions:
    └── "💡 Tip: Move Peter next to Ivan (language support)"
```

---

## New Features

### 1. Smart Rotation Engine

**Problem:** Static seating gets stale, cliques form

**Solution:** Intelligent automatic rotation

**Options:**
- Weekly rotation (everyone moves 1 desk)
- Bi-weekly with constraint preservation
- Monthly full reshuffle
- Custom: "Rotate every Monday except front row"

**Constraints preserved during rotation:**
- ☑ Keep front-row students in front 2 rows
- ☑ Don't separate ESL + language buddy
- ☑ Keep incompatible pairs separated

**Benefits:**
- Everyone experiences different zones
- Prevents "back row syndrome"
- Students meet different peers
- Data collection across positions

### 2. Behavioral Prediction Engine

**AI that predicts potential issues BEFORE they happen**

Features:
- Predict disruptive pairs based on profile similarity to past incidents
- Suggest successful peer tutoring pairs based on historical data
- Alert when attention zone capacity is exceeded

Example:
```
⚠️ HIGH RISK PAIRS:
• Jack (ADHD) + Kate (ADHD) → 87% chance of distraction together
  (similar profiles to past disruptive pairs)

💡 SUGGESTED PAIRS:
• Frank (struggling, math) + Alice (strong, math) → 92% success rate
  for peer tutoring (based on historical data)
```

### 3. Multiple Arrangement Modes

**One seating doesn't fit all situations:**

| Mode | Description |
|------|-------------|
| **Lecture Mode** | Front-facing rows, teacher attention zones prioritized |
| **Group Work Mode** | Pre-assigned teams seated together, mixed skills |
| **Test Mode** | Maximum spacing, separate cheaters/talkers, randomized |
| **Discussion Mode** | U-shape or circle, everyone sees each other |

### 4. Teacher's Proximity Assistant

**Model where teacher naturally spends time, optimize seats**

- Heat map of teacher's walking pattern
- Place ADHD students in HIGH ATTENTION zones
- Place independent workers in LOW SUPERVISION zones
- Place new/problem students in teacher's path

### 5. What-If Simulator

**Test changes before committing**

```
Question: "What if I move Frank to back row?"

Current Score: 82%
Predicted Score: 74% (-8%)

Impacts:
🔴 Frank: ADHD needs front row (VIOLATION)
🟡 Back row: Now has 3 struggling students
🟢 Emma: Loses her peer support buddy

Alternative suggestions:
→ "Move Frank to row 2 instead (score: 80%)"
→ "Swap Frank with Grace (score: 83%)"
```

### 6. Longitudinal Tracking

**Track impact of seating over entire semester/year**

Example for a student:
```
Weeks 1-4: Front Row
├── Math: 65% → 72% (+7%)
├── Behavior incidents: 2
└── Attention score: 8/10

Weeks 5-8: Row 3 (moved due to conflict)
├── Math: 72% → 68% (-4%)
├── Behavior incidents: 5 ↑
└── Attention score: 5/10 ↓

Recommendation: Return to front row
Correlation: Front row = +9% academic improvement
```

**Class-wide insights:**
- "Students in front 2 rows improved 15% vs back rows"
- "Separated conflict pairs had 60% fewer incidents"
- "ESL students near language buddies improved 22%"

### 7. Parent Portal

**Share seating info with parents (optional)**

Features:
- View child's seat location
- See seat neighbors
- View accommodations being met
- Teacher notes
- Request seating change option

### 8. Collaborative Seating (Student Voice)

**Let students have input (democratic classroom)**

Week 2: Students submit preferences
- "Name 1-2 people you work well with"
- "Is there anyone you'd prefer not to sit near?"
- "Where do you prefer sitting?"

Teacher sees:
- Summary of all preferences
- Conflict detection (mutual vs one-way)
- Compromise suggestions

### 9. Substitute Teacher Mode

**Special view for substitute teachers**

Features:
- Key information at a glance
- Highlight special needs students
- Note known conflicts
- Print-friendly format

### 10. Gamification for Students

**Make seating a learning experience**

- "Seating Bingo" - meet X classmates per rotation
- "Help Buddy Badge" - recognized for helping seatmate
- Track positive behaviors by seating arrangement
- Points for good collaboration with new seat partners

### 11. Analytics Dashboard

**Classroom Analytics Visualizations:**

| Chart | Description |
|-------|-------------|
| Academic Distribution | Pie chart of academic levels |
| Behavioral Heat Map | Color-coded by behavior level |
| Social Network Graph | Friendship/conflict connections |
| Attention Zone Map | Where teacher attention is focused |

**Insights:**
- "5 students need front row, but only 6 front seats"
- "12 students have conflicts with at least 1 peer"
- "Back row has 80% struggling students (consider swap)"
- "3 ESL students clustered together (good for support)"

### 12. Seating History & Comparison

**Compare different arrangements**

- Side-by-side comparison
- Score differences
- Diff summary
- Option to merge best parts

---

## Data Collection Methods

### Before Seating

| Source | Method | Data |
|--------|--------|------|
| Student Surveys | Digital questionnaire (Google Forms) | Preferences, learning style |
| School Records | CSV/API Import | Grades, attendance, behavior |
| Teacher Observations | Quick rating (1-5) | Behavior patterns, conflicts |
| Previous Seating | Database | What worked/didn't work |

### During Semester

| Source | Method | Data |
|--------|--------|------|
| Behavior Tracking | Incident reports | By seat location |
| Academic Performance | Grade updates | Correlation with seating |
| Student Feedback | Periodic surveys | Relationship changes |
| Teacher Notes | Quick entries | Observations |

---

## Algorithm Improvements

### Current Algorithm
- Genetic algorithm with 4 weighted objectives

### Proposed Enhancements

#### A. Hard vs Soft Constraints
- **HARD**: Cannot be violated (incompatible pairs)
- **SOFT**: Should try to meet (friends together)

#### B. Multi-Objective Optimization
- Pareto front visualization
- Trade-off between objectives
- Teacher can choose priority

#### C. Constraint Propagation
- Pre-process to reduce search space
- "Frank MUST be front row" → lock those seats

#### D. Explainability
- "Why was Alice placed here?" → Show reasons
- "Near friends Bob & Carol"
- "Good academic balance with neighbors"

#### E. Interactive Optimization
- Partial lock: "Keep these 5 students fixed"
- Optimize only the remaining seats

---

## UI/UX Enhancements

### Visual Improvements

| Feature | Description |
|---------|-------------|
| **Classroom Layout** | Actual desk shapes, door/window markers, whiteboard position |
| **Color Coding** | By academic level, behavior, gender, or special needs |
| **Quick Actions** | Right-click menu on student for common actions |
| **Print/Export** | PDF for substitutes, roster by seat number |
| **Mobile Friendly** | Tablet view, touch-friendly drag |

### Color Coding Options

- By academic level (gradient: red → yellow → green)
- By behavior (green/yellow/red)
- By gender (blue/pink/purple)
- By special needs (highlighted)
- By learning style (icons)
- By language (flags)

---

## Implementation Roadmap

### Phase 1: Immediate (Week 1-2)
- [ ] Fix drag & drop reliability
- [ ] Add real-time score recalculation
- [ ] Add constraint violation warnings
- [ ] Add undo/redo functionality
- [ ] Add first-day seating mode
- [ ] Add rotation scheduler

### Phase 2: Short-term (Month 1)
- [ ] Add student survey/feedback collection
- [ ] Add behavioral prediction engine (basic)
- [ ] Add multiple arrangement modes (lecture/test/group)
- [ ] Add what-if simulator
- [ ] Add print/PDF export

### Phase 3: Medium-term (Month 2-3)
- [ ] Add longitudinal tracking
- [ ] Add substitute teacher mode
- [ ] Add parent portal (optional)
- [ ] Add analytics dashboard
- [ ] Add social network visualization

### Phase 4: Long-term (Month 3+)
- [ ] Add student voice/collaborative seating
- [ ] Add advanced ML predictions
- [ ] Add gamification elements
- [ ] Add mobile app version
- [ ] Add LMS integration (Google Classroom, etc.)

---

## Priority Matrix

| Priority | Feature | Effort | Impact |
|----------|---------|--------|--------|
| 🔴 P1 | Real-time score recalculation | Medium | High |
| 🔴 P1 | Visual feedback (red/green drop zones) | Medium | High |
| 🔴 P1 | Warning when violating constraints | Low | High |
| 🔴 P1 | First-day seating mode | Medium | High |
| 🟡 P2 | Undo/Redo functionality | Medium | Medium |
| 🟡 P2 | Student survey data collection | High | High |
| 🟡 P2 | Analytics dashboard | High | Medium |
| 🟡 P2 | Rotation scheduler | Medium | High |
| 🟢 P3 | Seating history tracking | Medium | Medium |
| 🟢 P3 | Print/PDF export | Low | Medium |
| 🟢 P3 | Social network visualization | High | Low |
| 🟢 P3 | Parent portal | High | Medium |
| 🟢 P3 | Gamification | Medium | Low |

---

## Open Questions

1. **Questionnaire Format**: What data does the teacher already collect? Need to integrate with existing workflow.

2. **School Integration**: Is there an LMS or SIS to integrate with? (Google Classroom, PowerSchool, etc.)

3. **Multi-Teacher**: Does this need to support multiple teachers sharing classes?

4. **Multi-Classroom**: Can one teacher manage multiple class periods?

5. **Data Privacy**: What are the requirements for student data protection?

6. **Offline Mode**: Does the app need to work without internet?

---

## Notes

- This document should be updated as features are implemented
- Each phase should have its own detailed specification before implementation
- User testing should inform priorities

---

*Last updated: 2026-02-25*
