import { IncomingMessage } from 'http';
import https from 'https';

interface FetchResponse {
    data: any
    response: IncomingMessage
}

export type HttpMethod = 'GET' | 'POST' | 'DELETE' | 'PATCH' | 'PUT'

const fetchJson = ({
  url,
  method = 'GET',
  headers = {},
}: {
    url: string,
    method?: HttpMethod,
    headers?: Record<string, string>
}) : Promise<FetchResponse> => new Promise((resolve, reject) => {
  const req = https.request(
    url,
    {
      method,
      headers: {
        'content-type': 'application/json',
        ...headers,
      },
    },
    (res) => {
      res.setEncoding('utf8');
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        resolve({
          data: JSON.parse(data),
          response: res,
        });
      });
    },
  );

  req.on('error', (e) => {
    reject(e);
  });

  req.end();
});

const groupBy = <T, U extends Record<keyof T, any>>
  (collection: U[], groupingKey: keyof T) => collection
    .reduce((memo, value) => {
      // eslint-disable-next-line no-param-reassign
      memo[value[groupingKey]] ||= [];
      memo[value[groupingKey]].push(value);
      return memo;
    }, {} as Record<U[keyof T], U[]>);

const uniq = <T>(collection: T[]) : T[] => Array.from(new Set(collection));

const time = (description: string, fn: (...args: any[]) => any) => {
  const start = +new Date();
  fn();
  const end = +new Date();
  console.log(`${description ? `${description}: ` : ''}${end - start}ms`);
};

time.startTime = +new Date();
time.start = (() => { time.startTime = +new Date(); });
time.end = (() => { console.log(`${+new Date() - time.startTime}ms`); });

class Heap<T> {
  array: { indexingValue: number, element: T}[];

  constructor() {
    this.array = [];
  }

  value(index: number) {
    return this.array[index].indexingValue;
  }

  peek() {
    return this.array[0].element;
  }

  get size() {
    return this.array.length;
  }

  private heapifyUp() {
    let currentIndex = this.size - 1;
    let parentIndex = Heap.parentIndex(currentIndex);
    while (parentIndex >= 0 && this.value(currentIndex) > this.value(parentIndex)) {
      this.swap(parentIndex, currentIndex);
      currentIndex = parentIndex;
      parentIndex = Heap.parentIndex(currentIndex);
    }
  }

  private heapifyDown() {
    if (this.size < 1) {
      return;
    }
    let currentIndex = 0;
    while (this.hasLeftChild(currentIndex)) {
      let maxChildIndex = Heap.leftChildIndex(currentIndex);
      let maxChildValue = this.value(maxChildIndex);
      if (this.hasRightChild(currentIndex)
        && this.value(Heap.rightChildIndex(currentIndex)) > maxChildValue) {
        maxChildIndex = Heap.rightChildIndex(currentIndex);
        maxChildValue = this.value(maxChildIndex);
      }
      if (maxChildValue > this.value(currentIndex)) {
        this.swap(currentIndex, maxChildIndex);
        currentIndex = maxChildIndex;
      } else {
        break;
      }
    }
  }

  push(element: T, indexingValue: number) {
    this.array.push({ indexingValue, element });
    this.heapifyUp();
  }

  pop() {
    const value = this.peek();
    this.array[0] = this.array[this.size - 1];
    this.array.pop();
    this.heapifyDown();
    return value;
  }

  private swap(index1: number, index2: number) {
    const temp = this.array[index2];
    this.array[index2] = this.array[index1];
    this.array[index1] = temp;
  }

  private hasLeftChild(index: number) {
    return Heap.leftChildIndex(index) < this.size;
  }

  private hasRightChild(index: number) {
    return Heap.rightChildIndex(index) < this.size;
  }

  private static leftChildIndex(parentIndex: number) {
    return parentIndex * 2 + 1;
  }

  private static rightChildIndex(parentIndex: number) {
    return parentIndex * 2 + 2;
  }

  private static parentIndex(childIndex: number) {
    return Math.floor((childIndex - 1) / 2);
  }
}

export {
  fetchJson,
  groupBy,
  uniq,
  time,
  Heap,
};
