/**
 * Pipeline Executor to run a sequence of steps
 */
class Pipeline {
  constructor(steps = []) {
    this.steps = steps;
  }

  /**
   * Add a new step to the pipeline
   * @param {BaseStep} step 
   */
  addStep(step) {
    this.steps.push(step);
    return this;
  }

  /**
   * Execute all steps in order
   * @param {Object} initialContext - Initial data to start with
   * @returns {Promise<Object>} Final context after all steps
   */
  async execute(initialContext) {
    let context = { ...initialContext };
    
    for (const step of this.steps) {
      // Each step modifies the context or performs side effects
      await step.execute(context);
    }
    
    return context;
  }
}

module.exports = Pipeline;
