import React, { createContext, useContext } from 'react';

const PostCreatorFormContext = createContext(null);

export const PostCreatorFormProvider = ({ children, value }) => {
  return (
    <PostCreatorFormContext.Provider value={value}>
      {children}
    </PostCreatorFormContext.Provider>
  );
};

export const usePostCreatorFormContext = () => {
  const context = useContext(PostCreatorFormContext);
  if (!context) {
    throw new Error('usePostCreatorFormContext must be used within a PostCreatorFormProvider');
  }
  return context;
};
