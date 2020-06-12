module.exports = {
  numExecutingJobs: 0,
  threshold: 1,

  incrementExecutingJobs() {
    this.numExecutingJobs += 1;
  },

  decrementExecutingJobs() {
    this.numExecutingJobs -= 1;
  },
};
