package com.example.myapplication;

import androidx.test.espresso.Espresso;
import androidx.test.espresso.action.ViewActions;
import androidx.test.espresso.assertion.ViewAssertions;
import androidx.test.espresso.matcher.ViewMatchers;
import androidx.test.ext.junit.rules.ActivityScenarioRule;
import androidx.test.ext.junit.runners.AndroidJUnit4;

import org.hamcrest.Matchers;
import org.junit.Rule;
import org.junit.Test;
import org.junit.runner.RunWith;

import static org.junit.Assert.assertTrue;

@RunWith(AndroidJUnit4.class)
public class MainActivityAndroidTest {

    @Rule
    public ActivityScenarioRule<MainActivity> activityRule =
            new ActivityScenarioRule<>(MainActivity.class);

    // Existing test — killed by ArithmeticOperatorMutator (add→sub/mul)
    @Test
    public void helloWorldIsDisplayed() {
        Espresso.onView(ViewMatchers.withText("Hello World!"))
                .check(ViewAssertions.matches(ViewMatchers.isDisplayed()));
    }

    // Killed by FindViewByIdReturnsNullMutator (NPE setting listener),
    //           InvalidIDFindViewMutator (finds null view → NPE),
    //           ViewComponentNotVisibleMutator (INVISIBLE → isDisplayed fails)
    @Test
    public void button_isDisplayed() {
        Espresso.onView(ViewMatchers.withId(R.id.button_action))
                .check(ViewAssertions.matches(ViewMatchers.isDisplayed()));
    }

    // Killed by BuggyGUIListenerMutator (null listener → click does nothing)
    @Test
    public void buttonClick_updatesResultText() {
        Espresso.onView(ViewMatchers.withId(R.id.button_action))
                .perform(ViewActions.click());
        Espresso.onView(ViewMatchers.withId(R.id.text_result))
                .check(ViewAssertions.matches(ViewMatchers.withText("clicked")));
    }

    // Killed by LengthyGUIListenerMutator (Thread.sleep(10000) in onClick)
    @Test
    public void buttonClick_completesQuickly() {
        long start = System.currentTimeMillis();
        Espresso.onView(ViewMatchers.withId(R.id.button_action))
                .perform(ViewActions.click());
        long elapsed = System.currentTimeMillis() - start;
        assertTrue("onClick took too long: " + elapsed + "ms", elapsed < 5000);
    }

    // Killed by LengthyGUICreationMutator (Thread.sleep(10000) after super.onCreate)
    @Test
    public void activity_launchesQuickly() {
        // The ActivityScenarioRule has already launched the activity; if onCreate
        // slept for 10 s, this rule would have blocked and the total test time
        // would exceed the 5 s threshold we assert here.
        long[] launchMs = {0};
        long start = System.currentTimeMillis();
        activityRule.getScenario().onActivity(activity -> {
            launchMs[0] = System.currentTimeMillis() - start;
        });
        assertTrue("Activity launch took too long: " + launchMs[0] + "ms", launchMs[0] < 5000);
    }

    // Killed by InvalidViewFocusMutator (requestFocus() called on button in onCreate)
    @Test
    public void button_doesNotHaveFocusOnStart() {
        Espresso.onView(ViewMatchers.withId(R.id.button_action))
                .check(ViewAssertions.matches(Matchers.not(ViewMatchers.hasFocus())));
    }

    // Killed by ViewComponentNotVisibleMutator (result text set INVISIBLE)
    @Test
    public void resultText_isVisible() {
        Espresso.onView(ViewMatchers.withId(R.id.text_result))
                .check(ViewAssertions.matches(ViewMatchers.withEffectiveVisibility(
                        ViewMatchers.Visibility.VISIBLE)));
    }
}
