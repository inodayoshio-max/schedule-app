import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { getEvent, submitResponse, generateMeetingUrl, MEETING_TYPE_LABEL, MEETING_FORMAT_LABEL } from '../api/client';
import type { Event, Slot, MeetingFormat } from '../api/client';

function formatDt(dt: string) {
  try {
    return format(new Date(dt), 'M月d日(E) HH:mm', { locale: ja });
  } catch {
    return dt;
  }
}

function meetingBadge(label: string, type: 'face' | 'online' | 'either') {
  const colors: Record<string, string> = {
    face: 'bg-blue-100 text-blue-700',
    online: 'bg-green-100 text-green-700',
    either: 'bg-purple-100 text-purple-700',
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colors[type]}`}>
      {label}
    </span>
  );
}

type Mode = 'selecting' | 'proposing' | 'done';

export default function EventPage() {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<Event | null>(null);
  const [loadError, setLoadError] = useState('');

  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  // 「どちらでも可」スロットで選んだ形式
  const [chosenFormat, setChosenFormat] = useState<MeetingFormat>('face');

  const [proposedDates, setProposedDates] = useState(['', '']);
  const [mode, setMode] = useState<Mode>('selecting');
  const [confirmedUrl, setConfirmedUrl] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    getEvent(id)
      .then((ev) => {
        setEvent(ev);
        if (ev.slots.length > 0) setSelectedSlot(ev.slots[0]);
      })
      .catch((err: Error) => setLoadError(err.message));
  }, [id]);

  function addProposedDate() {
    setProposedDates((prev) => [...prev, '']);
  }
  function updateProposedDate(index: number, value: string) {
    setProposedDates((prev) => prev.map((d, i) => (i === index ? value : d)));
  }
  function removeProposedDate(index: number) {
    setProposedDates((prev) => prev.filter((_, i) => i !== index));
  }

  // 最終的な meeting_format を解決
  function resolveFormat(slot: Slot): MeetingFormat {
    if (slot.meeting_type === 'either') return chosenFormat;
    return slot.meeting_type as MeetingFormat;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!event || !id) return;
    setSubmitError('');

    if (!customerName.trim()) {
      setSubmitError('お名前を入力してください。');
      return;
    }

    if (mode === 'selecting') {
      if (!selectedSlot) {
        setSubmitError('候補日を選択してください。');
        return;
      }
      const format = resolveFormat(selectedSlot);
      const url = format === 'online' ? generateMeetingUrl() : '';

      setLoading(true);
      try {
        await submitResponse({
          eventId: id,
          customerName: customerName.trim(),
          customerEmail: customerEmail.trim() || undefined,
          responseType: 'selected',
          selectedSlotId: selectedSlot.id,
          meetingFormat: format,
          meetingUrl: url || undefined,
        });
        setConfirmedUrl(url);
        setMode('done');
      } catch (err) {
        setSubmitError((err as Error).message);
      } finally {
        setLoading(false);
      }
    } else {
      const filled = proposedDates.filter((d) => d.trim() !== '');
      if (filled.length === 0) {
        setSubmitError('ご希望日時を1つ以上入力してください。');
        return;
      }
      setLoading(true);
      try {
        await submitResponse({
          eventId: id,
          customerName: customerName.trim(),
          customerEmail: customerEmail.trim() || undefined,
          responseType: 'proposed',
          proposedDatetimes: filled,
        });
        setMode('done');
      } catch (err) {
        setSubmitError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-600">{loadError}</p>
      </div>
    );
  }
  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">読み込み中...</p>
      </div>
    );
  }

  // 完了画面
  if (mode === 'done') {
    const isOnline = !!confirmedUrl;
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 w-full max-w-md p-8 text-center">
          <div className="text-4xl mb-3">🙏</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">ご回答ありがとうございます</h1>

          {selectedSlot && (
            <div className="mt-4 bg-gray-50 rounded-xl p-4 text-left space-y-2">
              <p className="text-sm text-gray-500">確定した日時</p>
              <p className="font-semibold text-gray-900">📅 {formatDt(selectedSlot.datetime)}</p>
              <p className="text-sm text-gray-600">
                形式：{MEETING_FORMAT_LABEL[resolveFormat(selectedSlot)]}
              </p>
              {isOnline && (
                <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-xs text-green-600 font-semibold mb-1">📹 オンライン会議URL</p>
                  <a
                    href={confirmedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline break-all"
                  >
                    {confirmedUrl}
                  </a>
                  <p className="text-xs text-gray-400 mt-1">
                    ※ Jitsi Meet（無料・ブラウザのみで利用可）
                  </p>
                </div>
              )}
            </div>
          )}

          {!selectedSlot && (
            <p className="text-sm text-gray-500 mt-2">
              {event.host_name} より改めてご連絡いたします。
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 w-full max-w-lg p-8">
        <div className="mb-6">
          <p className="text-xs text-gray-400 mb-1">{event.host_name} より日程調整の依頼</p>
          <h1 className="text-2xl font-bold text-gray-900">{event.title}</h1>
          {event.description && (
            <p className="text-sm text-gray-500 mt-1">{event.description}</p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              お名前 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="例: 佐藤 次郎"
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              メールアドレス（任意）
            </label>
            <input
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              placeholder="example@mail.com"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {mode === 'selecting' ? (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">
                ご都合のよい日時を1つお選びください <span className="text-red-500">*</span>
              </p>
              <div className="space-y-2">
                {event.slots.map((slot) => {
                  const isSelected = selectedSlot?.id === slot.id;
                  return (
                    <div key={slot.id}>
                      <label
                        className={`flex items-center justify-between gap-3 border rounded-lg px-4 py-3 cursor-pointer transition-colors ${
                          isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="slot"
                            value={slot.id}
                            checked={isSelected}
                            onChange={() => setSelectedSlot(slot)}
                            className="accent-blue-600"
                          />
                          <span className="text-sm text-gray-800">{formatDt(slot.datetime)}</span>
                        </div>
                        {meetingBadge(MEETING_TYPE_LABEL[slot.meeting_type], slot.meeting_type)}
                      </label>

                      {/* どちらでも可のとき、選択中のスロットに形式選択を表示 */}
                      {isSelected && slot.meeting_type === 'either' && (
                        <div className="mt-2 ml-8 flex gap-3">
                          {(['face', 'online'] as MeetingFormat[]).map((fmt) => (
                            <label key={fmt} className="flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="radio"
                                name="format"
                                value={fmt}
                                checked={chosenFormat === fmt}
                                onChange={() => setChosenFormat(fmt)}
                                className="accent-blue-600"
                              />
                              <span className="text-sm text-gray-700">
                                {MEETING_FORMAT_LABEL[fmt]}
                              </span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => setMode('proposing')}
                className="mt-3 text-sm text-gray-400 hover:text-gray-600 underline"
              >
                候補日がすべて合わない場合はこちら
              </button>
            </div>
          ) : (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">
                ご希望の日時を入力してください <span className="text-red-500">*</span>
              </p>
              <p className="text-xs text-gray-400 mb-2">複数ご提案いただけると調整しやすくなります</p>
              <div className="space-y-2">
                {proposedDates.map((dt, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input
                      type="datetime-local"
                      value={dt}
                      onChange={(e) => updateProposedDate(i, e.target.value)}
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => removeProposedDate(i)}
                      disabled={proposedDates.length <= 1}
                      className="text-gray-400 hover:text-red-500 disabled:opacity-30 text-lg px-1"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-3 mt-2">
                <button type="button" onClick={addProposedDate} className="text-sm text-blue-600 hover:text-blue-800">
                  + 日時を追加
                </button>
                <button type="button" onClick={() => setMode('selecting')} className="text-sm text-gray-400 hover:text-gray-600">
                  ← 候補日一覧に戻る
                </button>
              </div>
            </div>
          )}

          {submitError && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{submitError}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
          >
            {loading ? '送信中...' : '回答を送信'}
          </button>
        </form>
      </div>
    </div>
  );
}
