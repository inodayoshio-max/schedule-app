import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { getAllEvents, MEETING_FORMAT_LABEL } from '../api/client';
import type { EventSummary, MeetingFormat } from '../api/client';

function formatDt(dt: string) {
  try {
    return format(new Date(dt), 'M月d日(E) HH:mm', { locale: ja });
  } catch {
    return dt;
  }
}

function buildGoogleCalendarUrl(title: string, datetime: string, hostName: string): string {
  const start = new Date(datetime);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  const fmt = (d: Date) =>
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${fmt(start)}/${fmt(end)}`,
    details: `担当: ${hostName}`,
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

function StatusBadge({ type }: { type: 'selected' | 'proposed' | null }) {
  if (type === 'selected') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        候補日選択済み
      </span>
    );
  }
  if (type === 'proposed') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
        別日程を提案
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
      未回答
    </span>
  );
}

export default function SchedulesPage() {
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getAllEvents()
      .then(setEvents)
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">スケジュール一覧</h1>
            <p className="text-sm text-gray-500 mt-0.5">作成した日程調整の一覧</p>
          </div>
          <Link
            to="/"
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            + 新規作成
          </Link>
        </div>

        {loading && <p className="text-center text-gray-400 py-12">読み込み中...</p>}
        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
        )}

        {!loading && !error && events.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg">日程調整がまだありません</p>
            <Link to="/" className="mt-2 inline-block text-sm text-blue-600 hover:underline">
              最初の日程調整を作成する →
            </Link>
          </div>
        )}

        <div className="space-y-3">
          {events.map((ev) => (
            <div
              key={ev.id}
              className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base font-semibold text-gray-900">{ev.title}</h2>
                    <StatusBadge type={ev.response_type} />
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">担当: {ev.host_name}</p>
                </div>
                <Link
                  to={`/event/${ev.id}/responses`}
                  className="text-xs text-blue-600 hover:underline whitespace-nowrap shrink-0"
                >
                  回答状況 →
                </Link>
              </div>

              {ev.customer_name && (
                <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div>
                    <p className="text-xs text-gray-400">顧客名</p>
                    <p className="text-gray-800 font-medium">{ev.customer_name}</p>
                  </div>
                  {ev.response_type === 'selected' && ev.selected_datetime && (
                    <div>
                      <p className="text-xs text-gray-400">確定日時</p>
                      <p className="text-gray-800 font-medium">{formatDt(ev.selected_datetime)}</p>
                    </div>
                  )}
                  {ev.response_type === 'selected' && ev.meeting_format && (
                    <div>
                      <p className="text-xs text-gray-400">形式</p>
                      <p className="text-gray-800 font-medium">
                        {MEETING_FORMAT_LABEL[ev.meeting_format as MeetingFormat]}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {ev.response_type === 'selected' && ev.selected_datetime && (
                <div className="mt-3">
                  <a
                    href={buildGoogleCalendarUrl(ev.title, ev.selected_datetime, ev.host_name)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11zM7 11h5v5H7z" />
                    </svg>
                    Googleカレンダーに追加
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
