declare module "arabic-reshaper" {
  interface ReshaperOptions {
    ligatures?: boolean;
    delete_harakat?: boolean;
    shift_harakat_position?: boolean;
    delete_before_last_letter?: boolean;
    standard_ligatures?: boolean;
    unshaped_word_separator?: number;
    digits_type?: number;
  }

  function reshape(text: string, options?: ReshaperOptions): string;
  function remove_harakat(text: string): string;
  function remove_all_harakat(text: string): string;
  function remove_ending_harakat(text: string): string;
  function remove_middle_harakat(text: string): string;
  function remove_leading_harakat(text: string): string;
  function remove_last_harakat(text: string): string;

  export default {
    reshape,
    remove_harakat,
    remove_all_harakat,
    remove_ending_harakat,
    remove_middle_harakat,
    remove_leading_harakat,
    remove_last_harakat,
  };
}