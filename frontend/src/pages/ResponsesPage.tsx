import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { getEventResponses, updateMeetingUrl, generateMeetingUrl, MEETING_FORMAT_LABEL, MEETING_TYPE_LABEL } from '../api/client';
import type { EventResponses, CustomerResponse } from '../api/client';

function formatDt(dt: string) {
  try {
    return format(new Date(dt), 'M月d日(E) HH:mm', { locale: ja });
  } catch {
    return dt;
  }
}

function buildReplyEmail(
  hostName: string,
  customerName: string,
  datetime: string,
  meetingUrl: string
): string {
  return `${customerName} 様

お世話になっております。
${hostName}です。

この度は日程のご回答をいただきありがとうございます。
下記の通りオンラインミーティングのURLをお送りいたします。

【日時】${formatDt(datetime)}
【ミーティングURL】${meetingUrl}

当日はURLをクリックしてご参加ください。
何かご不明な点がございましたら、お気軽にご連絡ください。

よろしくお願いいたします。`;
}

function MeetingUrlSection({
  response,
  hostName,
}: {
  response: CustomerResponse;
  hostName: string;
}) {
  const [url, setUrl] = useState(response.meeting_url ?? '');
  const [saved, setSaved] = useState(!!response.meeting_url);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedMail, setCopiedMail] = useState(false);

  async function handleSave() {
    if (!url.trim()) { setError('URLを入力してください'); return; }
    setSaving(true);
    setError('');
    try {
      await updateMeetingUrl(response.id, url.trim());
      setSaved(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function handleJitsi() {
    setUrl(generateMeetingUrl());
    setSaved(false);
  }

  function handleCopyUrl() {
    navigator.clipboard.writeText(url).then(() => {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    });
  }

  function handleCopyMail() {
    const text = buildReplyEmail(
      hostName,
      response.customer_name,
      response.selected_datetime ?? '',
      url
    );
    navigator.clipboard.writeText(text).then(() => {
      setCopiedMail(true);
      setTimeout(() => setCopiedMail(false), 2000);
    });
  }

  const emailText = saved && url && response.selected_datetime
    ? buildReplyEmail(hostName, response.customer_name, response.selected_datetime, url)
    : '';

  return (
    <div className="mt-3 bg-white border border-green-200 rounded-lg p-3 space-y-2">
      <p className="text-xs text-green-700 font-semibold">📹 オンライン会議URL</p>

      {saved && url ? (
        // URL確定済み
        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline break-all"
            >
              {url}
            </a>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={handleCopyUrl}
              className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg transition-colors"
            >
              {copiedUrl ? 'コピー済！' : 'URLをコピー'}
            </button>
            <button
              onClick={() => setSaved(false)}
              className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1.5"
            >
              変更
            </button>
          </div>

          {/* メール返信文 */}
          {emailText && (
            <div className="border-t border-gray-100 pt-3 space-y-2">
              <p className="text-xs font-semibold text-gray-500">📧 メール返信文</p>
              <textarea
                readOnly
                value={emailText}
                rows={11}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-700 bg-gray-50 resize-none"
              />
              <button
                onClick={handleCopyMail}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium py-2 rounded-lg transition-colors"
              >
                {copiedMail ? 'コピー済！' : 'メール文をコピー'}
              </button>
            </div>
          )}
        </div>
      ) : (
        // URL未設定 or 編集中
        <div className="space-y-2">
          <input
            type="url"
            value={url}
            onChange={(e) => { setUrl(e.target.value); setError(''); }}
            placeholder="https://zoom.us/j/..."
            className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <div className="flex gap-2 items-center flex-wrap">
            <button
              onClick={handleSave}
              disabled={saving}
              className="text-xs bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg transition-colors"
            >
              {saving ? '保存中...' : '保存'}
            </button>
            <button
              onClick={handleJitsi}
              className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg transition-colors"
            >
              Jitsi Meetを自動発行
            </button>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
      )}
    </div>
  );
}

function ResponseCard({ response, hostName }: { response: CustomerResponse; hostName: string }) {
  const isSelected = response.response_type === 'selected';
  const isOnline = response.meeting_format === 'online';

  return (
    <div className={`border rounded-xl p-4 ${isSelected ? 'border-green-200 bg-green-50' : 'border-orange-200 bg-orange-50'}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-gray-900">{response.customer_name}</p>
          {response.customer_email && (
            <p className="text-xs text-gray-500">{response.customer_email}</p>
          )}
        </div>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${
          isSelected ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
        }`}>
          {isSelected ? '✓ 日程を選択' : '↗ 希望日を提案'}
        </span>
      </div>

      <div className="mt-3 space-y-1">
        {isSelected ? (
          <>
            <p className="text-sm text-gray-800 font-medium">
              📅 {response.selected_datetime ? formatDt(response.selected_datetime) : '—'}
            </p>
            {response.meeting_format && (
              <p className="text-sm text-gray-600">
                形式：{MEETING_FORMAT_LABEL[response.meeting_format]}
              </p>
            )}
            {isOnline && <MeetingUrlSection response={response} hostName={hostName} />}
          </>
        ) : (
          <>
            <p className="text-xs text-gray-500">ご希望日時：</p>
            {response.proposed_dates.map((dt, i) => (
              <p key={i} className="text-sm text-gray-800">📅 {formatDt(dt)}</p>
            ))}
          </>
        )}
      </div>

      <p className="text-xs text-gray-400 mt-2">
        {format(new Date(response.created_at), 'M/d HH:mm', { locale: ja })} 回答
      </p>
    </div>
  );
}

export default function ResponsesPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<EventResponses | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    getEventResponses(id)
      .then(setData)
      .catch((err: Error) => setError(err.message));
  }, [id]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">読み込み中...</p>
      </div>
    );
  }

  const { event, responses } = data;
  const selected = responses.filter((r) => r.response_type === 'selected');
  const proposed = responses.filter((r) => r.response_type === 'proposed');

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="text-xs text-gray-400">回答状況</p>
              <h1 className="text-xl font-bold text-gray-900">{event.title}</h1>
              {event.description && (
                <p className="text-sm text-gray-500 mt-0.5">{event.description}</p>
              )}
            </div>
            <Link to="/schedules" className="text-xs text-blue-600 hover:underline whitespace-nowrap">
              一覧に戻る →
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-green-700">{selected.length}</p>
              <p className="text-xs text-green-600">候補日を選択</p>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-orange-700">{proposed.length}</p>
              <p className="text-xs text-orange-600">別日程を提案</p>
            </div>
          </div>

          {responses.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">まだ回答がありません</p>
          ) : (
            <div className="space-y-3">
              {responses.map((r) => (
                <ResponseCard key={r.id} response={r} hostName={event.host_name} />
              ))}
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-500 mb-2">設定した候補日時</p>
            <div className="space-y-1.5">
              {event.slots.map((slot) => {
                const count = selected.filter((r) => r.selected_slot_id === slot.id).length;
                return (
                  <div key={slot.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">
                      {formatDt(slot.datetime)}
                      <span className="ml-2 text-xs text-gray-400">
                        ({MEETING_TYPE_LABEL[slot.meeting_type]})
                      </span>
                    </span>
                    {count > 0 && (
                      <span className="text-green-600 font-medium text-xs">{count}人が選択</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
