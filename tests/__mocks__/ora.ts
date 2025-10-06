interface OraInstance {
  start: () => OraInstance;
  succeed: () => OraInstance;
  fail: () => OraInstance;
  stop: () => OraInstance;
  text: string;
}

const ora = (message?: string): OraInstance => ({
  start: function() { return this; },
  succeed: function() { return this; },
  fail: function() { return this; },
  stop: function() { return this; },
  text: message || '',
});

export default ora;
export type Ora = OraInstance;
