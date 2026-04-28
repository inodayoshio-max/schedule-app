import { useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import SlotPicker from '../components/SlotPicker';
import { createEvent, MEETING_TYPE_LABEL } from '../api/client';
import type { Event, SlotInput } from '../api/client';

function formatDt(dt: string) {
  try {
    return format(new Date(dt), 'M月d日(E) HH:mm', { locale: ja });
  } catch {
    return dt;
  }
}

function buildEmailText(event: Event, url: string, companyName: string): string {
  const slotLines = event.slots
    .map((s) => `  ・${formatDt(s.datetime)}（${MEETING_TYPE_LABEL[s.meeting_type]}）`)
    .join('\n');

  const sender = companyName
    ? `${companyName}の${event.host_name}`
    : event.host_name;

  return `${sender}と申します。

お打ち合わせの日程につきまして、ご都合のほどお伺いできればと存じます。

下記の候補日時の中から、ご都合のよろしい日時を1つお選びいただけますでしょうか。
もしいずれの日程もご都合が合わない場合は、ご対応可能な日時をいくつかお知らせいただけますと幸いです。

▼ ご回答フォーム
${url}

【候補日時】
${slotLines}

お手数をおかけいたしますが、何卒よろしくお願いいたします。`;
}

export default function Home() {
  const [companyName, setCompanyName] = useState('');
  const [hostName, setHostName] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [slots, setSlots] = useState<SlotInput[]>([{ datetime: '', meeting_type: 'face' }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState<Event | null>(null);
  const [createdCompanyName, setCreatedCompanyName] = useState('');
  const [copied, setCopied] = useState<'url' | 'mail' | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const filled = slots.filter((s) => s.datetime.trim() !== '');
    if (filled.length === 0) {
      setError('候補日時を1つ以上入力してください。');
      return;
    }

    setLoading(true);
    try {
      const event = await createEvent({
        title: title.trim(),
        description: description.trim() || undefined,
        host_name: hostName.trim(),
        slots: filled,
      });
      setCreatedCompanyName(companyName.trim());
      setCreated(event);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function copy(text: string, type: 'url' | 'mail') {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  if (created) {
    const eventUrl = `${window.location.origin}/event/${created.id}`;
    const responsesUrl = `${window.location.origin}/event/${created.id}/responses`;
    const emailText = buildEmailText(created, eventUrl, createdCompanyName);

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 w-full max-w-lg p-8">
          <div className="text-center mb-6">
            <div className="text-4xl mb-2">✅</div>
            <h1 className="text-xl font-bold text-gray-900">イベントを作成しました</h1>
            <p className="text-sm text-gray-500 mt-1">{created.title}</p>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">お客様への回答URL</p>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={eventUrl}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-700"
                />
                <button
                  onClick={() => copy(eventUrl, 'url')}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-2 rounded-lg transition-colors whitespace-nowrap"
                >
                  {copied === 'url' ? 'コピー済！' : 'コピー'}
                </button>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">メール本文</p>
              <textarea
                readOnly
                value={emailText}
                rows={13}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-700 resize-none"
              />
              <button
                onClick={() => copy(emailText, 'mail')}
                className="mt-1 w-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm py-2 rounded-lg transition-colors"
              >
                {copied === 'mail' ? 'コピー済！' : 'メール文をコピー'}
              </button>
            </div>

            <div className="pt-2 border-t border-gray-100 flex justify-between items-center">
              <Link to={responsesUrl} className="text-sm text-blue-600 hover:underline">
                回答状況を確認 →
              </Link>
              <button
                onClick={() => {
                  setCreated(null);
                  setTitle('');
                  setDescription('');
                  setCompanyName('');
                  setHostName('');
                  setSlots([{ datetime: '', meeting_type: 'face' }]);
                }}
                className="text-sm text-gray-400 hover:text-gray-600"
              >
                新規作成
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 w-full max-w-lg p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">日程調整を作成</h1>
        <p className="text-sm text-gray-500 mb-6">
          候補日を設定してお客様に共有するURLとメール文を発行します
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                会社名（任意）
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="例: 株式会社〇〇"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                お名前 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={hostName}
                onChange={(e) => setHostName(e.target.value)}
                placeholder="例: 山田 花子"
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              件名・目的 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例: 打ち合わせの日程確認"
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              補足・場所など（任意）
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="例: 所要時間1時間程度"
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              候補日時と形式 <span className="text-red-500">*</span>
            </label>
            <SlotPicker slots={slots} onChange={setSlots} />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
          >
            {loading ? '作成中...' : 'URLとメール文を発行'}
          </button>
        </form>
      </div>
    </div>
  );
}
