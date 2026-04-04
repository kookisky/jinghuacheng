import ReactMarkdown from 'react-markdown';

interface Props {
  markdown: string;
}

export default function AnalysisView({ markdown }: Props) {
  return (
    <article className="prose prose-gray max-w-none prose-headings:scroll-mt-20">
      <ReactMarkdown>{markdown}</ReactMarkdown>
    </article>
  );
}
