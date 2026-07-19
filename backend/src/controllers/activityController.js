const db = require('../utils/db');
const { mockDB } = require('../utils/mockData');

// ─── Fetch Activity Logs ──────────────────────────────────────────────────────
async function getPetActivities(req, res) {
  try {
    const { petId } = req.params;
    const userId = req.userId;

    if (process.env.DATABASE_URL) {
      const petCheck = await db.query(
        'SELECT id FROM "Pet" WHERE "id" = $1 AND "userId" = $2',
        [petId, userId]
      );
      if (petCheck.rowCount === 0) {
        return res.status(404).json({ error: 'Pet not found or unauthorized.' });
      }

      const result = await db.query(
        'SELECT * FROM "ActivityLog" WHERE "petId" = $1 ORDER BY "date" ASC',
        [petId]
      );
      return res.status(200).json({ activities: result.rows });
    }

    return res.status(200).json({ activities: mockDB.getActivityLogsForPet(petId) });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch activities.', details: error.message });
  }
}

// ─── Add Activity Log ─────────────────────────────────────────────────────────
async function addPetActivity(req, res) {
  try {
    const { petId } = req.params;
    const userId = req.userId;
    const { type, value, date } = req.body;

    if (!type || value === undefined) {
      return res.status(400).json({ error: 'Activity type and value are required.' });
    }

    const logDate = date || new Date().toISOString().split('T')[0];

    if (process.env.DATABASE_URL) {
      const petCheck = await db.query(
        'SELECT id FROM "Pet" WHERE "id" = $1 AND "userId" = $2',
        [petId, userId]
      );
      if (petCheck.rowCount === 0) {
        return res.status(404).json({ error: 'Pet not found or unauthorized.' });
      }

      const result = await db.query(
        `INSERT INTO "ActivityLog" ("petId", "type", "value", "date", "createdAt")
         VALUES ($1, $2, $3, $4, NOW()) RETURNING *`,
        [petId, type, Number(value), logDate]
      );
      return res.status(201).json({ activity: result.rows[0] });
    }

    const activity = mockDB.addActivityLog({ petId, type, value, date: logDate });
    return res.status(201).json({ activity });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to add activity.', details: error.message });
  }
}

// ─── Fetch Dashboard Analytics Data ───────────────────────────────────────────
async function getPetDashboardData(req, res) {
  try {
    const { petId } = req.params;
    const userId = req.userId;

    let petName = '';
    let petBreed = '';

    let vaccinationsList = [];
    let medicalRecordsList = [];
    let activityLogsList = [];
    let appointmentsList = [];

    // 1. Verify Pet & Fetch Data
    if (process.env.DATABASE_URL) {
      const petCheck = await db.query(
        'SELECT id, name, breed FROM "Pet" WHERE "id" = $1 AND "userId" = $2',
        [petId, userId]
      );
      if (petCheck.rowCount === 0) {
        return res.status(404).json({ error: 'Pet not found or unauthorized.' });
      }
      petName = petCheck.rows[0].name;
      petBreed = petCheck.rows[0].breed;

      const vRes = await db.query('SELECT * FROM "Vaccination" WHERE "petId" = $1', [petId]);
      vaccinationsList = vRes.rows;

      const mRes = await db.query('SELECT * FROM "MedicalRecord" WHERE "petId" = $1', [petId]);
      medicalRecordsList = mRes.rows;

      const aRes = await db.query('SELECT * FROM "ActivityLog" WHERE "petId" = $1', [petId]);
      activityLogsList = aRes.rows;

      const apRes = await db.query('SELECT * FROM "Appointment" WHERE "petId" = $1', [petId]);
      appointmentsList = apRes.rows;
    } else {
      const pet = (mockDB.getPetsByUser(userId) || []).find(p => p.id === petId);
      if (!pet) {
        return res.status(404).json({ error: 'Pet not found or unauthorized.' });
      }
      petName = pet.name;
      petBreed = pet.breed;

      vaccinationsList = mockDB.getVaccinations(petId);
      medicalRecordsList = mockDB.getMedicalRecords(petId);
      activityLogsList = mockDB.getActivityLogsForPet(petId);
      appointmentsList = (mockDB.getAppointmentsByUser(userId) || []).filter(a => a.petId === petId);
    }

    // 2. Health Score Calculations (out of 100 pts)
    let hasAnyData = false;

    // A. Vaccinations (Max 20)
    let vaccinationScore = 0;
    let vaccinationStatus = 'No Data';
    if (vaccinationsList.length > 0) {
      hasAnyData = true;
      vaccinationStatus = 'Good';
      vaccinationScore = 20;

      // Check if any is overdue
      const today = new Date().toISOString().split('T')[0];
      const overdue = vaccinationsList.some(v => v.nextDueDate && v.nextDueDate < today);
      if (overdue) {
        vaccinationStatus = 'Overdue';
        vaccinationScore = 10;
      }
    }

    // B. Medical Records (Max 20)
    let medicalScore = 0;
    let medicalStatus = 'No Data';
    if (medicalRecordsList.length > 0) {
      hasAnyData = true;
      medicalStatus = 'Good';
      medicalScore = 20;
    }

    // C. Exercise Log (Max 20)
    let exerciseScore = 0;
    let exerciseStatus = 'No Data';
    const last7DaysLogs = activityLogsList.filter(l => {
      const logDate = new Date(l.date);
      const diffTime = Math.abs(new Date() - logDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 7;
    });

    const exerciseLogs = last7DaysLogs.filter(l => l.type === 'exercise');
    if (exerciseLogs.length > 0) {
      hasAnyData = true;
      const totalExercise = exerciseLogs.reduce((sum, l) => sum + Number(l.value), 0);
      const avgExercise = totalExercise / 7;

      if (avgExercise >= 30) {
        exerciseStatus = 'Good';
        exerciseScore = 20;
      } else if (avgExercise >= 10) {
        exerciseStatus = 'Fair';
        exerciseScore = 12;
      } else {
        exerciseStatus = 'Poor';
        exerciseScore = 5;
      }
    }

    // D. Nutrition Logs (Max 15)
    let nutritionScore = 0;
    let nutritionStatus = 'No Data';
    const nutritionLogs = last7DaysLogs.filter(l => l.type === 'nutrition');
    if (nutritionLogs.length > 0) {
      hasAnyData = true;
      if (nutritionLogs.length >= 5) {
        nutritionStatus = 'Good';
        nutritionScore = 15;
      } else if (nutritionLogs.length >= 2) {
        nutritionStatus = 'Fair';
        nutritionScore = 9;
      } else {
        nutritionStatus = 'Poor';
        nutritionScore = 4;
      }
    }

    // E. Hydration Logs (Max 15)
    let hydrationScore = 0;
    let hydrationStatus = 'No Data';
    const hydrationLogs = last7DaysLogs.filter(l => l.type === 'hydration');
    if (hydrationLogs.length > 0) {
      hasAnyData = true;
      if (hydrationLogs.length >= 5) {
        hydrationStatus = 'Good';
        hydrationScore = 15;
      } else if (hydrationLogs.length >= 2) {
        hydrationStatus = 'Fair';
        hydrationScore = 9;
      } else {
        hydrationStatus = 'Poor';
        hydrationScore = 4;
      }
    }

    // F. Recent Vet Visits (Max 10)
    let vetVisitScore = 0;
    let vetVisitStatus = 'No Data';
    const completedAppointments = appointmentsList.filter(a => a.status === 'completed');
    if (completedAppointments.length > 0) {
      hasAnyData = true;
      vetVisitStatus = 'Good';
      vetVisitScore = 10;
    }

    // Sleep Status (Optional, not counted in score directly, but shown in stats)
    let sleepStatus = 'No Data';
    const sleepLogs = last7DaysLogs.filter(l => l.type === 'sleep');
    if (sleepLogs.length > 0) {
      hasAnyData = true;
      const totalSleep = sleepLogs.reduce((sum, l) => sum + Number(l.value), 0);
      const avgSleep = totalSleep / sleepLogs.length;
      if (avgSleep >= 8 && avgSleep <= 14) {
        sleepStatus = 'Good';
      } else if (avgSleep >= 6 || avgSleep <= 16) {
        sleepStatus = 'Fair';
      } else {
        sleepStatus = 'Poor';
      }
    }

    const calculatedScore = hasAnyData 
      ? (vaccinationScore + medicalScore + exerciseScore + nutritionScore + hydrationScore + vetVisitScore)
      : null;

    // 3. Compile Chart Data for last 7 calendar days
    // We will generate the labels like ["Mon", "Tue", ...] or their actual days, and total exercise value for each.
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const chartData = [];
    
    // Sort activity logs by date so they match chronological order
    const dailyExerciseMap = {};
    activityLogsList.forEach(log => {
      if (log.type === 'exercise') {
        const formattedDate = new Date(log.date).toISOString().split('T')[0];
        dailyExerciseMap[formattedDate] = (dailyExerciseMap[formattedDate] || 0) + Number(log.value);
      }
    });

    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const dateStr = d.toISOString().split('T')[0];
      const dayLabel = daysOfWeek[d.getDay()];
      chartData.push({
        day: dayLabel,
        date: dateStr,
        value: dailyExerciseMap[dateStr] || 0
      });
    }

    return res.status(200).json({
      petId,
      petName,
      petBreed,
      healthScore: calculatedScore,
      healthStats: {
        nutrition: nutritionStatus,
        exercise: exerciseStatus,
        sleep: sleepStatus,
        hydration: hydrationStatus
      },
      chartData,
      hasActivities: activityLogsList.length > 0,
      hasHealthRecords: hasAnyData
    });

  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch dashboard data.', details: error.message });
  }
}

module.exports = {
  getPetActivities,
  addPetActivity,
  getPetDashboardData
};
