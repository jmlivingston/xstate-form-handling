import React, { useCallback } from "react";
import {
  ThemeProvider,
  CSSReset,
  FormControl,
  FormLabel,
  Input,
  FormErrorMessage,
  Button,
  Box,
  ColorModeProvider,
  Icon,
  Text
} from "@chakra-ui/core";
import { Machine, assign } from "xstate";
import { useMachine } from "@xstate/react";

/**
 * Our machine has 3 main states:
 * - Editing
 * - Submitting
 * - Success
 *
 * While editing, we want the user to be able to... edit!
 * And also submit the form.
 *
 * While submitting, we don't want the user to be able to do anything,
 * so we fire the "onSubmit" service, which can be whatever you like!
 * By not specifying in the machine what this service is, the consumer
 * of the machine can decide for themselves what they want the
 * submission process to look like, sync validation, async validation,
 * anything you want! Use any validation library you want, or none at all.
 */
const formMachine = Machine(
  {
    initial: "editing",
    context: {
      values: {},
      errors: {}
    },
    states: {
      editing: {
        initial: "pristine",
        on: {
          CHANGE: {
            actions: ["onChange"]
          },
          SUBMIT: "submitting"
        },
        states: {
          pristine: {
            entry: ["clearForm"]
          },
          error: {}
        }
      },
      submitting: {
        invoke: {
          src: "onSubmit",
          onDone: "success",
          onError: {
            target: "editing.error",
            actions: ["onError"]
          }
        }
      },
      success: {
        id: "success",
        on: {
          AGAIN: "editing"
        }
      }
    }
  },
  {
    actions: {
      onChange: assign({
        values: (ctx, e) => ({
          ...ctx.values,
          [e.key]: e.value
        })
      }),
      clearForm: assign({
        values: {},
        errors: {}
      }),
      onError: assign({
        errors: (_ctx, e) => e.data
      })
    }
  }
);

/**
 * An arbitrary office-themed validation function
 */
const salesTeam = [
  "Jim Halper",
  "Dwight Schrute",
  "Phyllis Vance",
  "Stanley Hudson"
];

const onSubmit = async ({ values }) => {
  await new Promise(r => setTimeout(r, 1000));

  const errors = {};

  if (!values.name || !salesTeam.includes(values.name)) {
    errors.name = "That person is not in the sales team!";
  }

  if (!values.reams || values.reams < 100) {
    errors.reams = "Not enough reams!";
  }

  if (!values.company) {
    errors.company = "Which company did you sell to?";
  } else if (values.company === "Dunder Mifflin") {
    errors.company = "You can't sell to yourself!";
  }

  if (Object.keys(errors).length > 0) {
    /**
     * We have errors, so reject the submission, leading the machine
     * into the errors state. We pass the errors into the Promise rejection
     * so the machine can add them to the infinite state (context)
     */
    return Promise.reject(errors);
  }

  /**
   * Everything validated so we can send this form to the backend.
   * In case the backend rejects the form we can still reject the submission
   * after that!
   */

  /**
   * Return true to let the machine know it can move to the success state
   */
  return true;
};

const Index = () => {
  const [state, send] = useMachine(formMachine, {
    services: { onSubmit }
  });

  const handleSubmit = useCallback(
    e => {
      e.preventDefault();
      send("SUBMIT");
    },
    [send]
  );

  const handleChange = useCallback(
    e => {
      e.preventDefault();
      send("CHANGE", { key: e.target.name, value: e.target.value });
    },
    [send]
  );

  const { values, errors } = state.context;

  return (
    <ThemeProvider>
      <ColorModeProvider>
        <CSSReset />
        <Box
          height="100vh"
          display="flex"
          justifyContent="center"
          alignItems="center"
          flexDirection="column"
        >
          <Box maxW="sm">
            <Text as="h1" fontSize="3xl" fontWeight="bolder" textAlign="center">
              Dunder Mifflin Infinity
            </Text>
            {/**
             * We want to show the form only in the "editing" and the "submitting" state.
             * This is a easy to do and very readable with xstate
             */}
            {(state.matches("editing") || state.matches("submitting")) && (
              <>
                <Text mb={5} textAlign="center">
                  Please enter your sales
                </Text>
                <Box as="form" position="relative" onSubmit={handleSubmit}>
                  <FormControl isInvalid={errors.name}>
                    <FormLabel htmlFor="name">Name</FormLabel>
                    <Input
                      name="name"
                      placeholder="Jim Halpert"
                      isInvalid={!!errors.name}
                      value={values.name || ""}
                      onChange={handleChange}
                    />
                    <FormErrorMessage>{errors.name}</FormErrorMessage>
                  </FormControl>
                  <FormControl mt={2} isInvalid={errors.reams}>
                    <FormLabel htmlFor="reams">Reams</FormLabel>
                    <Input
                      name="reams"
                      type="number"
                      placeholder="At least 100 reams plz"
                      isInvalid={!!errors.reams}
                      value={values.reams || ""}
                      onChange={handleChange}
                    />
                    <FormErrorMessage>{errors.reams}</FormErrorMessage>
                  </FormControl>
                  <FormControl mt={2} isInvalid={errors.company}>
                    <FormLabel htmlFor="company">Company</FormLabel>
                    <Input
                      name="company"
                      type="text"
                      placeholder="Prince Family Paper"
                      isInvalid={!!errors.company}
                      value={values.company || ""}
                      onChange={handleChange}
                    />
                    <FormErrorMessage>{errors.company}</FormErrorMessage>
                  </FormControl>
                  <Button
                    mt={5}
                    variantColor="teal"
                    /**
                     * Show chakra-ui's neat button loading state when
                     * we are in the "submitting" state
                     */
                    isLoading={state.matches("submitting")}
                    type="submit"
                  >
                    Submit
                  </Button>
                </Box>
              </>
            )}
            {/**
             * Show some kind of success message when in the "success" state
             */}
            {state.matches("success") && (
              <Box
                flexDirection="column"
                justifyContent="center"
                alignItems="center"
                textAlign="center"
              >
                <Box
                  display="flex"
                  textAlign="center"
                  justifyContent="center"
                  alignItems="center"
                  mt={3}
                >
                  <Icon name="check" color="green.400" size="32px" />
                  <Text pl={2}>Thanks for your sale!</Text>
                </Box>
                <Button
                  mt={6}
                  variantColor="teal"
                  isLoading={state.matches("editing.submitting")}
                  type="submit"
                  leftIcon="repeat"
                  onClick={() => send("AGAIN")}
                >
                  Add more sales
                </Button>
              </Box>
            )}
          </Box>
        </Box>
      </ColorModeProvider>
    </ThemeProvider>
  );
};

export default Index;
