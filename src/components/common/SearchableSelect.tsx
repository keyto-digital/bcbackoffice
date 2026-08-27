import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useId,
} from "react";

import type {
  CSSProperties,
  KeyboardEvent,
} from "react";

import {
  createPortal,
} from "react-dom";


export type SearchableSelectOption = {
  value: string;
  label: string;
  searchText?: string;
};


type SearchableSelectProps = {
  value: string;

  options:
    SearchableSelectOption[];

  placeholder?: string;

  disabled?: boolean;

  onChange: (
    value: string
  ) => void;

  emptyMessage?: string;
};


export default function SearchableSelect({
  value,
  options,
  placeholder =
    "Pilih data...",

  disabled = false,

  onChange,

  emptyMessage =
    "Data tidak ditemukan.",
}: SearchableSelectProps) {

  const uniqueId =
    useId()
      .replace(
        /:/g,
        ""
      );


  const containerRef =
    useRef<HTMLDivElement | null>(
      null
    );


  const dropdownRef =
    useRef<HTMLDivElement | null>(
      null
    );


  const searchInputRef =
    useRef<HTMLInputElement | null>(
      null
    );


  const activeOptionRef =
    useRef<HTMLButtonElement | null>(
      null
    );


  const [
    isOpen,
    setIsOpen,
  ] =
    useState(false);


  const [
    search,
    setSearch,
  ] =
    useState("");


  const [
    activeIndex,
    setActiveIndex,
  ] =
    useState(-1);


  const [
    dropdownStyle,
    setDropdownStyle,
  ] =
    useState<CSSProperties>({});


  const selectedOption =
    useMemo(
      () =>
        options.find(
          (
            option
          ) =>
            option.value ===
            value
        ) ?? null,

      [
        options,
        value,
      ]
    );


  const filteredOptions =
    useMemo(() => {

      const keyword =
        search
          .trim()
          .toLowerCase();


      if (!keyword) {
        return options;
      }


      return options.filter(
        (
          option
        ) => {

          const searchableValue =
            [
              option.label,

              option.searchText ??
                "",
            ]
              .join(" ")
              .toLowerCase();


          return searchableValue.includes(
            keyword
          );
        }
      );

    }, [
      options,
      search,
    ]);


  const updateDropdownPosition =
    () => {

      const element =
        containerRef.current;


      if (!element) {
        return;
      }


      const rect =
        element.getBoundingClientRect();


      const dropdownWidth =
        Math.max(
          rect.width,
          320
        );


      const viewportHeight =
        window.innerHeight;


      /*
       * Tinggi estimasi:
       *
       * Search input
       * +
       * sekitar 5 baris item
       */
      const estimatedHeight =
        300;


      const spaceBelow =
        viewportHeight -
        rect.bottom;


      const shouldOpenAbove =
        spaceBelow <
          estimatedHeight &&
        rect.top >
          spaceBelow;


      if (
        shouldOpenAbove
      ) {

        setDropdownStyle({
          position:
            "fixed",

          left:
            rect.left,

          bottom:
            viewportHeight -
              rect.top +
            4,

          width:
            dropdownWidth,

          zIndex:
            9999,
        });

        return;

      }


      setDropdownStyle({
        position:
          "fixed",

        left:
          rect.left,

        top:
          rect.bottom +
          4,

        width:
          dropdownWidth,

        zIndex:
          9999,
      });

    };


  const closeDropdown =
    () => {

      setIsOpen(
        false
      );


      setSearch(
        ""
      );


      setActiveIndex(
        -1
      );

    };


  const openDropdown =
    (
      initialIndex =
        -1
    ) => {

      if (disabled) {
        return;
      }


      updateDropdownPosition();


      setIsOpen(
        true
      );


      setActiveIndex(
        initialIndex
      );


      requestAnimationFrame(
        () => {

          searchInputRef.current?.focus();

        }
      );

    };


  const selectOption =
    (
      option:
        SearchableSelectOption
    ) => {

      onChange(
        option.value
      );


      closeDropdown();

    };


  /*
   * Saat hasil search berubah,
   * reset pilihan keyboard.
   */
  useEffect(() => {

    if (
      activeIndex >=
      filteredOptions.length
    ) {

      setActiveIndex(
        filteredOptions.length > 0
          ? 0
          : -1
      );

    }

  }, [
    filteredOptions,
    activeIndex,
  ]);


  /*
   * Item aktif otomatis terlihat.
   */
  useEffect(() => {

    if (
      activeIndex >= 0
    ) {

      activeOptionRef.current?.scrollIntoView({
        block:
          "nearest",
      });

    }

  }, [
    activeIndex,
  ]);


  /*
   * Click di luar component.
   */
  useEffect(() => {

    if (!isOpen) {
      return;
    }


    const handleClickOutside =
      (
        event:
          MouseEvent
      ) => {

        const target =
          event.target as Node;


        const container =
          containerRef.current;


        const dropdown =
          dropdownRef.current;


        if (
          container &&
          !container.contains(
            target
          ) &&
          dropdown &&
          !dropdown.contains(
            target
          )
        ) {

          closeDropdown();

        }

      };


    const handleWindowChange =
      () => {

        updateDropdownPosition();

      };


    document.addEventListener(
      "mousedown",
      handleClickOutside
    );


    window.addEventListener(
      "resize",
      handleWindowChange
    );


    window.addEventListener(
      "scroll",
      handleWindowChange,
      true
    );


    return () => {

      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );


      window.removeEventListener(
        "resize",
        handleWindowChange
      );


      window.removeEventListener(
        "scroll",
        handleWindowChange,
        true
      );

    };

  }, [
    isOpen,
  ]);


  const handleKeyboardNavigation =
    (
      event:
        KeyboardEvent<
          HTMLInputElement |
          HTMLButtonElement
        >
    ) => {

      /*
       * Arrow Down
       */
      if (
        event.key ===
        "ArrowDown"
      ) {

        event.preventDefault();


        if (!isOpen) {

          openDropdown(
            0
          );

          return;

        }


        if (
          filteredOptions.length ===
          0
        ) {

          return;

        }


        setActiveIndex(
          (
            previous
          ) => {

            if (
              previous <
              filteredOptions.length - 1
            ) {

              return previous + 1;

            }


            return 0;

          }
        );


        return;

      }


      /*
       * Arrow Up
       */
      if (
        event.key ===
        "ArrowUp"
      ) {

        event.preventDefault();


        if (!isOpen) {

          openDropdown(
            Math.max(
              filteredOptions.length - 1,
              0
            )
          );

          return;

        }


        if (
          filteredOptions.length ===
          0
        ) {

          return;

        }


        setActiveIndex(
          (
            previous
          ) => {

            if (
              previous <= 0
            ) {

              return (
                filteredOptions.length - 1
              );

            }


            return previous - 1;

          }
        );


        return;

      }


      /*
       * Enter
       */
      if (
        event.key ===
        "Enter"
      ) {

        if (!isOpen) {

          return;

        }


        event.preventDefault();


        if (
          activeIndex >= 0 &&
          filteredOptions[
            activeIndex
          ]
        ) {

          selectOption(
            filteredOptions[
              activeIndex
            ]
          );

        }


        return;

      }


      /*
       * Escape
       */
      if (
        event.key ===
        "Escape"
      ) {

        event.preventDefault();


        closeDropdown();

        return;

      }

    };


  const dropdown =
    isOpen
      ? createPortal(

          <div
            ref={
              dropdownRef
            }

            id={
              `searchable-select-dropdown-${uniqueId}`
            }

            style={
              dropdownStyle
            }

            className="
              overflow-hidden
              rounded-md
              border
              border-gray-300
              bg-white
              shadow-lg
            "
          >

            {/* ===============================
                SEARCH
            =============================== */}

            <div
              className="
                border-b
                border-gray-200
                bg-white
                p-2
              "
            >

              <input
                ref={
                  searchInputRef
                }

                type="text"

                value={
                  search
                }

                onChange={
                  (
                    event
                  ) => {

                    setSearch(
                      event.target.value
                    );


                    setActiveIndex(
                      0
                    );

                  }
                }

                onKeyDown={
                  handleKeyboardNavigation
                }

                placeholder={
                  placeholder
                }

                className="
                  w-full
                  rounded
                  border
                  border-gray-300
                  px-3
                  py-2
                  text-sm
                  outline-none
                  focus:border-blue-500
                "
              />

            </div>


            {/* ===============================
                LIST
                MAKSIMAL SEKITAR 5 BARIS
            =============================== */}

            <div
              className="
                max-h-[220px]
                overflow-y-auto
                overscroll-contain
              "
            >

              {/* =============================
                  RESET / PILIH PRODUK
              ============================= */}

              <button
                type="button"

                onMouseDown={
                  (
                    event
                  ) =>
                    event.preventDefault()
                }

                onClick={
                  () => {

                    onChange(
                      ""
                    );


                    closeDropdown();

                  }
                }

                className="
                  block
                  min-h-[44px]
                  w-full
                  border-b
                  border-gray-100
                  px-3
                  py-2
                  text-left
                  text-sm
                  text-gray-500
                  hover:bg-gray-100
                "
              >

                -- PILIH PRODUK --

              </button>


              {
                filteredOptions.length ===
                0 ? (

                  <div
                    className="
                      px-3
                      py-3
                      text-sm
                      text-gray-500
                    "
                  >

                    {
                      emptyMessage
                    }

                  </div>

                ) : (

                  filteredOptions.map(
                    (
                      option,
                      index
                    ) => {

                      const isSelected =
                        option.value ===
                        value;


                      const isActive =
                        index ===
                        activeIndex;


                      return (

                        <button
                          key={
                            option.value
                          }

                          ref={
                            isActive
                              ? activeOptionRef
                              : null
                          }

                          type="button"

                          onMouseEnter={
                            () =>
                              setActiveIndex(
                                index
                              )
                          }

                          onMouseDown={
                            (
                              event
                            ) =>
                              event.preventDefault()
                          }

                          onClick={
                            () =>
                              selectOption(
                                option
                              )
                          }

                          className={`
                            block
                            min-h-[44px]
                            w-full
                            px-3
                            py-2
                            text-left
                            text-sm
                            transition-colors

                            ${
                              isActive
                                ? "bg-gray-200 text-gray-900"
                                : ""
                            }

                            ${
                              !isActive &&
                              isSelected
                                ? "bg-blue-50 text-blue-700"
                                : ""
                            }

                            ${
                              !isActive &&
                              !isSelected
                                ? "text-gray-700 hover:bg-gray-100"
                                : ""
                            }
                          `}
                        >

                          {
                            option.label
                          }

                        </button>

                      );

                    }
                  )

                )
              }

            </div>

          </div>,

          document.body

        )
      : null;


  return (

    <div
      ref={
        containerRef
      }

      className="
        relative
        w-full
        min-w-[240px]
      "
    >

      {/* ===============================
          TRIGGER
      =============================== */}

      <button
        type="button"

        disabled={
          disabled
        }

        onClick={
          () => {

            if (
              isOpen
            ) {

              closeDropdown();

            } else {

              const selectedIndex =
                options.findIndex(
                  (
                    option
                  ) =>
                    option.value ===
                    value
                );


              openDropdown(
                selectedIndex
              );

            }

          }
        }

        onKeyDown={
          handleKeyboardNavigation
        }

        className={`
          flex
          min-h-[38px]
          w-full
          items-center
          justify-between
          gap-2
          rounded
          border
          border-gray-300
          bg-white
          px-3
          py-2
          text-left
          text-sm
          transition-colors

          ${
            disabled
              ? "cursor-not-allowed bg-gray-100 text-gray-400"
              : "hover:border-gray-400 focus:border-blue-500"
          }
        `}
      >

        <span
          className={
            selectedOption
              ? "truncate text-gray-700"
              : "truncate text-gray-400"
          }
        >

          {
            selectedOption
              ?.label ??
            placeholder
          }

        </span>


        <span
          className={`
            shrink-0
            text-xs
            text-gray-500
            transition-transform

            ${
              isOpen
                ? "rotate-180"
                : ""
            }
          `}
        >

          ▲

        </span>

      </button>


      {
        dropdown
      }

    </div>

  );

}