export interface MindmapNode {
  id: string;
  topic: string;
  children: MindmapNode[];
}

export const sampleMindmap: MindmapNode = {
  id: 'root',
  topic: 'Maskininlärning',
  children: [
    {
      id: 'supervised',
      topic: 'Övervakad inlärning',
      children: [
        { id: 'classification', topic: 'Klassificering', children: [] },
        { id: 'regression', topic: 'Regression', children: [] },
        { id: 'svm', topic: 'SVM', children: [] },
      ],
    },
    {
      id: 'unsupervised',
      topic: 'Oövervakad inlärning',
      children: [
        { id: 'clustering', topic: 'Klustring', children: [] },
        { id: 'dim-reduction', topic: 'Dimensionsreduktion', children: [] },
      ],
    },
    {
      id: 'deep',
      topic: 'Djupinlärning',
      children: [
        { id: 'nn', topic: 'Neurala nätverk', children: [] },
        { id: 'cnn', topic: 'CNN', children: [] },
        { id: 'rnn', topic: 'RNN / LSTM', children: [] },
      ],
    },
    {
      id: 'rl',
      topic: 'Förstärkningsinlärning',
      children: [
        { id: 'agent', topic: 'Agent & Miljö', children: [] },
        { id: 'reward', topic: 'Belöningsfunktion', children: [] },
      ],
    },
    {
      id: 'eval',
      topic: 'Utvärdering',
      children: [
        { id: 'cv', topic: 'Korsvalidering', children: [] },
        { id: 'cm', topic: 'Konfusionsmatris', children: [] },
      ],
    },
  ],
};
