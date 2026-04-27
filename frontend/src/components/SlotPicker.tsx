import type { SlotInput, MeetingType } from '../api/client';

interface Props {
  slots: SlotInput[];
  onChange: (slots: SlotInput[]) => void;
}

const MEETING_OPTIONS: { value: MeetingType; label: string }[] = [
  { value: 'face', label: '対面MTG' },
  { value: 'online', label: 'オンラインMTG' },
  { value: 'either', label: 'どちらでも可' },
];

export default function SlotPicker({ slots, onChange }: Props) {
  function add() {
    onChange([...slots, { datetime: '', meeting_type: 'face' }]);
  }

  function updateDatetime(index: number, value: string) {
    const next = [...slots];
    next[index] = { ...next[index], datetime: value };
    onChange(next);
  }

  function updateType(index: number, value: MeetingType) {
    const next = [...slots];
    next[index] = { ...next[index], meeting_type: value };
    onChange(next);
  }

  function remove(index: number) {
    onChange(slots.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-3">
      {slots.map((slot, i) => (
        <div key={i} className="flex gap-2 items-center">
          <input
            type="datetime-local"
            value={slot.datetime}
            onChange={(e) => updateDatetime(i, e.target.value)}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <select
            value={slot.meeting_type}
            onChange={(e) => updateType(i, e.target.value as MeetingType)}
            className="border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            {MEETING_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => remove(i)}
            disabled={slots.length <= 1}
            className="text-gray-400 hover:text-red-500 disabled:opacity-30 text-lg font-bold px-1"
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
      >
        + 候補日時を追加
      </button>
    </div>
  );
}
