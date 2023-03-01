import {
  BasePostMessageStream,
  PostMessageEvent,
} from '../BasePostMessageStream';
import { isValidStreamMessage } from '../utils';

const getSource = Object.getOwnPropertyDescriptor(MessageEvent.prototype, 'source').get;
const getOrigin = Object.getOwnPropertyDescriptor(Event.prototype, 'origin').get;
const getTarget = Object.getOwnPropertyDescriptor(Event.prototype, 'target').get;

interface WindowPostMessageStreamArgs {
  name: string;
  target: string;
  targetOrigin?: string;
  targetWindow?: Window;
}

/**
 * A {@link Window.postMessage} stream.
 */
export class WindowPostMessageStream extends BasePostMessageStream {
  private _name: string;

  private _target: string;

  private _targetOrigin: string;

  private _targetWindow: Window;

  /**
   * Creates a stream for communicating with other streams across the same or
   * different `window` objects.
   *
   * @param args - Options bag.
   * @param args.name - The name of the stream. Used to differentiate between
   * multiple streams sharing the same window object.
   * @param args.target - The name of the stream to exchange messages with.
   * @param args.targetOrigin - The origin of the target. Defaults to
   * `location.origin`, '*' is permitted.
   * @param args.targetWindow - The window object of the target stream. Defaults
   * to `window`.
   */
  constructor({
    name,
    target,
    targetOrigin = location.origin,
    targetWindow = window,
  }: WindowPostMessageStreamArgs) {
    super();

    if (
      typeof window === 'undefined' ||
      typeof window.postMessage !== 'function'
    ) {
      throw new Error(
        'window.postMessage is not a function. This class should only be instantiated in a Window.',
      );
    }

    this._name = name;
    this._target = target;
    this._targetOrigin = targetOrigin;
    this._targetWindow = targetWindow;
    this._onMessage = this._onMessage.bind(this);

    window.addEventListener('message', this._onMessage as any, false);

    this._handshake();
  }

  protected _postMessage(data: unknown): void {
    this._targetWindow.postMessage(
      {
        target: this._target,
        data,
      },
      this._targetOrigin,
    );
  }

  private _onMessage(event: PostMessageEvent): void {
    const message = event.data;

    if (
      (this._targetOrigin !== '*' && getOrigin.call(event) !== this._targetOrigin) ||
      getSource.call(event) !== this._targetWindow ||
      !isValidStreamMessage(message) ||
      getTarget.call(message) !== this._name
    ) {
      return;
    }

    this._onData(message.data);
  }

  _destroy(): void {
    window.removeEventListener('message', this._onMessage as any, false);
  }
}
