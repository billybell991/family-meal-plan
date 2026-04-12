import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ChoresPage() {
  const [plan, setPlan] = useState(null);
  const [newAchievements, setNewAchievements] = useState([]);

  const loadPlan = useCallback(async () => {
    const response = await fetch('/api/plan');
    const data = await response.json();
    setPlan(data);
  }, []);

  return (
    <div>
      {newAchievements.length > 0 && (
        <div className="fixed top-20 right-4 z-50">
          {newAchievements.map(ach => (
            <div key={ach.id} className="bg-green-500 text-white p-4 rounded-lg shadow-lg mb-2">
              <h3 className="font-bold">Sticker Unlocked!</h3>
              <p>{ach.name}</p>
            </div>
          ))}
        </div>
      )}

      {/* The rest of the component */}
    </div>
  )

  const loadChoreLibrary = useCallback(async () => {
    const response = await fetch('/api/chore-library');
    const data = await response.json();
    console.log(data);
  }, []);
}