"use client";

type Content = {
  title: string;
  texts: string[];
};

type LegalContentProps = {
  title: string;
  description: string;
  date: string;
  content: Content[];
};

const LegalContent = ({
  title,
  description,
  date,
  content,
}: LegalContentProps) => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">{title}</h1>
      <p className="text-gray-300 mb-2">{description}</p>
      <p className="text-gray-300 mb-8">{date}</p>
      <div className="space-y-8">
        {content.map((item, index) => (
          <div key={index}>
            <h2 className="text-2xl font-bold mb-4">{item.title}</h2>
            {item.texts.map((text, i) => (
              <p key={i} className="text-gray-300 mb-4">
                {text}
              </p>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default LegalContent;
