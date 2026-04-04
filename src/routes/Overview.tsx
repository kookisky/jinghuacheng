import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Link } from 'react-router-dom';

export default function Overview() {
  const [markdown, setMarkdown] = useState<string | null>(null);

  useEffect(() => {
    import('../content/overview.md?raw').then(mod => setMarkdown(mod.default));
  }, []);

  if (markdown === null) {
    return <div className="p-8 text-center text-gray-400">載入中...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <article className="prose prose-gray max-w-none">
        <ReactMarkdown
          components={{
            // 場次超連結：把「第XX場」轉為可點擊連結
            p: ({ children, ...props }) => {
              return <p {...props}>{processSessionLinks(children)}</p>;
            },
            li: ({ children, ...props }) => {
              return <li {...props}>{processSessionLinks(children)}</li>;
            },
          }}
        >
          {markdown}
        </ReactMarkdown>
      </article>
    </div>
  );
}

// 把文字中的「第XX場」轉為 Link
function processSessionLinks(children: React.ReactNode): React.ReactNode {
  if (!children) return children;

  if (typeof children === 'string') {
    return replaceSessionRefs(children);
  }

  if (Array.isArray(children)) {
    return children.map((child, i) => {
      if (typeof child === 'string') {
        return <span key={i}>{replaceSessionRefs(child)}</span>;
      }
      return child;
    });
  }

  return children;
}

function replaceSessionRefs(text: string): React.ReactNode {
  const regex = /第(\d{2})場/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const sessionId = match[1];
    parts.push(
      <Link
        key={match.index}
        to={`/sessions/${sessionId}`}
        className="text-blue-600 hover:underline"
      >
        第{sessionId}場
      </Link>
    );
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length === 1 ? parts[0] : <>{parts}</>;
}
