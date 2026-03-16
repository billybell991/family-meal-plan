import { useState } from 'react';
import { addRating } from '../api.js';

const FAMILY = ['Mom', 'Dad', 'Maya', 'Maddy'];

export default function RatingStars({ mealName }) {
  const [selected, setSelected] = useState(null);
  const [member, setMember] = useState('');
  const [hover, setHover] = useState(0);
  const [saved, setSaved] = useState(false);
  const [open, setOpen] = useState(false);

  const handleRate = async (stars) => {
    setSelected(stars);
    if (!member) { setOpen(true); return; }
    await submitRating(stars, member);
  };

  const submitRating = async (stars, m) => {
    try {
      await addRating(mealName, m, stars);
      setSaved(true);
      setOpen(false);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error('Rating failed', e);
    }
  };

  if (saved) {
    return <p className="text-xs text-green-600 font-medium">✅ Rating saved!</p>;
  }

  return (
    <div>
      <div className="flex items-center gap-1">
        <span className="text-xs text-gray-400 mr-1">Rate:</span>
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            type="button"
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            onClick={() => handleRate(star)}
            className="text-base leading-none transition-transform hover:scale-125"
            title={`${star} star${star > 1 ? 's' : ''}`}
          >
            {star <= (hover || selected || 0) ? '⭐' : '☆'}
          </button>
        ))}
      </div>

      {open && (
        <div className="mt-2 bg-gray-50 rounded-xl p-3 border border-gray-100">
          <p className="text-xs text-gray-600 mb-2 font-medium">Who's rating it?</p>
          <div className="flex flex-wrap gap-2">
            {FAMILY.map(m => (
              <button
                key={m}
                type="button"
                onClick={() => { setMember(m); submitRating(selected, m); }}
                className="text-xs px-2.5 py-1 rounded-full border border-gray-200 hover:bg-brand-50 hover:text-brand-700 hover:border-brand-300 transition-colors"
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
